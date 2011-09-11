#!/usr/bin/env python

import numpy as np


class KRLS:
    """
    Kernel Recursive Least-Squares Regression.
    Using this model is simple:
    1. Create a new instance, provide a kernel and the model parameters
    2. Call the update() method with one or more samples a time.
       The update method can be called repeatedly.
    3. Call the query() method to make predictions. If you provide a target
       value, the error is computed automatically. Again, you might to query
       several samples at a time, or one by one by calling the method
       repeatedly.
    """
    def __init__(self, kernel, params={}):
        """
        Initialization of a new instance of KRLS.
        """
        self.kernel = kernel        # Instance of a kernel to use
        # initialize with some reasonable values
        self.adopt_thresh = 0.25    # approximate linear dependence threshold [0,1]
        self.dico_max_size = 15     # maximum size of the dictionary
        self.adaptive = True        # flag if elimination is data-adaptive
        self.alpha = None
        self.p = [[1]]
        self.gamma = 0.1            # intrinsic regularization (ridge term coefficient)
        self.dico = None            # the dictionary of relevant states
        self.target = None          # the associated targets
        self.k = None               # the kernel matrix
        self.kinv = None            # the inverse kernel matrix
        self.forget_rate = 0.0      # how fast we want to forget what we did see
        self.dico_idx = []          # index when we added what
        # Allow overriding the attributes through the params dictionary
        for k in params:
            if hasattr(self, k):
                setattr(self, k, params[k])
    
    def setup(self, sample, target):
        """
        Used for initializing everything with a first sample and target.
        """
        if self.dico != None:
            return
        self.dico = sample
        self.target = target
        self.dico_idx.append(len(self.dico_idx))
        self.p = [[1]]
        self.k = self.gamma + self.kernel(sample, sample).T
        self.kinv = 1 / self.k
        self.alpha = np.dot(self.kinv, target)
    
    def update(self, sample, target):
        """
        Update the model using a sample and a target.
        """
        # Make sure we have numpy arrays
        s = np.array(sample)
        t = np.array(target)
        # Check if we have one or several samples. If we have several samples,
        # we split them and treat them separately.
        if len(s.shape) > 1:
            for i in range(len(s)):
                self.update(s[i], t[i])
            return
        # Check if we have already an element in our dictionary.
        # If not, set up everything.
        if self.dico == None:
            self.setup(sample, target)
            return
        # First step is evaluating the sample in order to know if it is
        # linearly dependent upon the dictionary or not.
        sample_eval = self.evaluate_sample(sample)
        if sample_eval['dt'] > self.adopt_thresh:
            # We add the sample to the dictionary.
            self.add_sample_to_dictionary(
                sample, target, 
                sample_eval['ktt'], sample_eval['ktwid'], 
                sample_eval['at'], sample_eval['dt']
            )
            # Clean up the dictionary if it gets too big
            if self.dico.shape[0] > self.dico_max_size:
                # If we follow an adaptive cleanup strategy, remove the least
                # relevant sample. If not, just remove the oldest sample.
                if self.adaptive:
                    idx = self.least_relevant_element_in_dictionary()
                else:
                    idx = dico_idx.index(min(self.dico_idx))
                self.eliminate_element_in_dictionary(idx)
                # Update the weights
                self.alpha = np.dot(self.kinv, self.target)
            else:
                # We did add a sample, but no cleanup was needed.
                # In this case, we make an ordinary update of the weights.
                self.p = np.vstack(
                    [np.hstack([self.p, np.zeros((self.dico.shape[0] - 1, 1))]),
                    np.hstack([np.zeros((1, self.dico.shape[0] - 1)), [[1]]])]
                )
                self.alpha = np.dot(self.kinv, self.target)
        else:
            # We don't add the sample to the dictionary, but we update the
            # weight in order to not waste the sample. Something like a 
            # smart incremental reduced rank regression (SMIRRR)
            tmp = np.dot(self.p, sample_eval['at'])
            qt = tmp / ( 1 + np.dot(sample_eval['at'].T, tmp))
            self.p = self.p - np.dot(qt, tmp.T)
            self.alpha = self.alpha + np.dot(
                self.kinv, 
                qt * (target - np.dot(sample_eval['ktwid'].T, self.alpha))
            )
    
    def evaluate_sample(self, sample):
        """
        Evaluates a sample if it is ALD or not.
        If not, we should include it into the dictionary,
        otherwise, we can simply ignore it.
        """
        if self.dico == None:
            return {'ktt': None, 'ktwid': None, 'at': None, 'dt': 0.0}
        ktt = self.gamma + self.kernel(sample, sample).T
        ktwid = self.kernel(self.dico, sample).T
        at = np.dot(self.kinv, ktwid)
        dt = ktt - np.dot(ktwid.T, at)
        return {'ktt': ktt, 'ktwid': ktwid, 'at': at, 'dt': dt}
    
    def add_sample_to_dictionary(self, sample, target, ktt=None, ktwid=None, at=None, dt=None):
        self.dico = np.vstack([self.dico, sample])
        self.target = np.vstack([self.target, target])
        # Add an entry to the dictionary index list to remember this element
        self.dico_idx.append(len(self.dico_idx))
        # Update the kernel and inverse kernel matrices
        if ktt == None:
            ktt = self.gamma + self.kernel(sample, sample).T
        if ktwid == None:
            ktwid = self.kernel(self.dico, sample).T
        if at == None:
            at = np.dot(self.kinv, ktwid)
        if dt == None:
            dt = ktt - np.dot(ktwid.T, at)
        self.k = np.vstack([
            np.hstack([self.k, ktwid]), 
            np.hstack([ktwid.T, ktt]) 
        ])
        self.kinv = (1 / dt[0,0]) * np.vstack([ 
            np.hstack([dt[0,0] * self.kinv + np.dot(at, at.T), -at]), 
            np.hstack([-at.T, [[1]]])
        ])
    
    def least_relevant_element_in_dictionary(self):
        # Should we simply select the oldest one as the least relevant?
        # This behaviour is determined by the forget rate.
        if np.random.uniform(0,1) < self.forget_rate:
            return self.dico_idx.index(min(self.dico_idx))
        # Otherwise, compute the heuristics based on Kruif & Vries,
        # IEEE Trans. Neural Net. (2003)
        weights = abs(self.alpha.T[0] / np.diag(self.kinv[:-1,:-1]))
        return weights.argmin()
    
    def eliminate_element_in_dictionary(self, idx):
        """
        Removes the element at index idx [0 to nelems-1].
        """
        # Delete column idx and row idx from matrix k
        self.k  = np.delete(np.delete(self.k, idx, 0), idx, 1)
        # Extract the row vector idx and eliminate the idx-th element from it
        f = np.delete(np.matrix(self.kinv[idx]), idx, 1)
        # Delete column and row idx from kinv, and update kinv using f
        kinv2 = np.delete(np.delete(self.kinv, idx, 0), idx, 1)
        self.kinv = np.array(kinv2 - (f.T*f) / self.kinv[idx,idx])
        # Eliminate the element idx in the dictionary and the target
        self.dico = np.delete(self.dico, idx, 0)
        self.target = np.delete(self.target, idx, 0)
        # Update the dictionary accordingly: eliminate the entry idx,
        # and decrease by 1 all the younger elements higher than this entry.
        didx = self.dico_idx.pop(idx)
        ndico = np.array(self.dico_idx)
        self.dico_idx = list(np.where(ndico > didx, ndico - 1, ndico))
    
    def query(self, sample, target=None):
        kernvals = self.kernel(sample, self.dico).T
        res = np.dot(kernvals, self.alpha)
        if target is None:
            return res
        # Compute the mean square error
        t = np.array(target)
        err = np.mean((res - t)**2)
        return {'prediction': res, 'mse': err}
    


