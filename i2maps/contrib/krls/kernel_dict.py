#!/bin/env python
#
# File name: kernel_dict.py
# Copyright: (C) 2010 i2maps
#
# Kernel dictionary implementation.
#
# The dictionary works incrementally.
#
# When new sample comes with the stream, we only add those into the dictionary
# whose features aren't representable as a linear (in RKHS space) combination
# of the entries already contained in the dictionary.
#
# When a limit of the size of the dictionary is reached,
# some entries are eliminated. It happens by either simply 
# removing the oldest or smartly guessing which one is least important.
#
#   adopt_thresh    approximate linear dependence threshold, [0, 1)
#   maxsize         maximum size of the dictionary 
#   adaptive        indicator if elimination is data-adaptive, True/False
#   forget_rate     frequency rate for forced elimination of the oldest entry, [0, 1]


import numpy as np

class KernelDict():

     def __init__(self, kernel, adopt_thresh, state, target, maxsize, 
                          adaptive_cleanup = True, forget_rate = 0.0):
                          
          # intrinsic regularization (ridge term coefficient) 
          # also helps in case of numerical instabilities
          self.gamma = 0.001
          
          # kernel parameter, such as gaussian bandwidth
          #self.kparam = kparam
          
          # threshold to decide how new is the incoming sample. 
          # 0 means everyone is brand new
          self.adopt_thresh = adopt_thresh
          
          # Dictionary inputs-outputs
          self.Dict = state 
          self.Targ = target
                   
          # a kernel function
          self.kernel_function = kernel
          
          # kernel matrix and its inverse. They are updated incrementally
          self.K = self.gamma + self.kernel_function(state, state).T
          self.Kinv = 1 / self.K

          # if a new entry was added at an iteration
          self.addedFlag = True
          
          # if an old/irrelevant entry was eliminated at an iteration
          self.eliminatedFlag = False
          
          # Number of entries in the dictionary
          self.numel = 1
          
          # max allowed size of the dictionary
          self.maxsize = maxsize
          
          # if clean up should be adaptive. bit slower but awesome
          self.adaptive_cleanup = adaptive_cleanup
          
          # probability of forced clean up the oldest one
          self.forget_rate = forget_rate
          
          # index of entries
          self.dindex = np.array(range(maxsize))
          
          
     def update(self, state, target, Alpha ):
          self.ktt = self.gamma + self.kernel_function( state, state).T
          
          self.ktwid = self.kernel_function(self.Dict, state).T
                                        
          self.at = np.dot(self.Kinv,self.ktwid)
          self.dt = self.ktt - np.dot(self.ktwid.T,self.at)
          self.addedFlag = False   
          self.eliminatedFlag = False
          
          
          if ( self.dt > self.adopt_thresh ):
            
              # the new sample is not ALD; add it to dictionary
              
              self.Dict = np.vstack([ self.Dict, state ])
              self.Targ = np.vstack([ self.Targ, target])         
              
              
              # and update kernel and inverse kernel matrices
              self.K = np.vstack([ np.hstack([self.K, self.ktwid]), np.hstack([self.ktwid.T, self.ktt]) ])
              self.Kinv = (1/self.dt[0,0])*np.vstack([ np.hstack([self.dt[0,0]*self.Kinv + np.dot(self.at,self.at.T), -self.at]), np.hstack([-self.at.T, [[1]]]) ])
                            
              self.addedFlag = True
              self.numel = self.numel + 1
              if (self.numel > self.maxsize): # clean up dictionary if limit reached
                             
                 if (self.adaptive_cleanup):
                 
                     # be smart: clean up by eliminating the least relevant entry
                     # requires interaction with weight's solver
                     
                     # first of all we might want to eliminate the oldest
                     if ( float(np.random.rand(1)[0]) < self.forget_rate ):
                     
                        ind = self.dindex.argmin()+1
                                             
                     else:
                        # heurisitcs on least relevant from  Kruif&Vries IEEE Trans. Neural Net. (2003)
                        weights = abs(Alpha.T[0]/np.diag(self.Kinv[:-1][:,:-1] ))
                        ind = weights.argmin() + 1
                                                          
                     if (ind == 1):
                           
                       # free some room by eliminating the oldest entry
                       # or if by chance it is the least relevant
                       
                       self.K  = np.array(self.K[1:][:,1:])                
                        
                       f = np.matrix(self.Kinv[0][1:])
                       self.Kinv = np.array(self.Kinv[1:][:,1:] - (f.T*f) / (self.Kinv[0][0]))
                                      
                       self.Dict = np.array(self.Dict[1:,:][:])
                       self.Targ = np.array(self.Targ[1:])
                        
                       self.numel = self.numel - 1    
                       self.eliminatedFlag = True     
                       
                       self.dindex = self.dindex-1;
                       self.dindex = np.hstack([self.dindex[1:], self.maxsize])
                                            
                     else: 
                                                                                     
                       ## now goes crazy shuffling to remove the *ind* column/row from K and Kinv. this won't go if ind==1. 
                       #
                       #P = [np.vstack([ 
                       #np.vstack([ np.hstack([
                       #      np.hstack([[[0]], np.zeros((1,ind-2))]),          np.hstack([[[1]], np.zeros((1, self.numel-ind))]) ]),
                       #      np.hstack([
                       #      np.hstack([np.zeros((ind-2,1)), np.eye(ind-2)]), np.hstack([np.zeros((ind-2,1)), np.zeros((ind-2, self.numel-ind))]) ] )  ]),
                       ## oh boy..
                       #np.vstack([ np.hstack([
                       #      np.hstack([[[1]], np.zeros((1, ind-2))]),                           np.hstack([[[0]], np.zeros((1, self.numel-ind))]) ]),
                       #      np.hstack([
                       #      np.hstack([np.zeros((self.numel-ind, 1)), np.zeros((self.numel-ind, ind-2))]), np.hstack([np.zeros((self.numel-ind, 1)), np.eye(self.numel-ind)]) ]) ]) ])]
                       
                       
                       # which after an hour of struggle appeared to be simply
                       P = np.matrix(np.eye(self.numel))
                       P[ind-1,ind-1] = 0
                       P[0, 0] = 0
                       P[ind-1, 0] = 1
                       P[0, ind-1] = 1
                       
                       # this is what we had a fight for
                       self.K = np.matrix(np.dot(np.dot(P, self.K), P))
                       self.Kinv = np.matrix(np.dot(np.dot(P, self.Kinv), P))
                                             
                                                                      
                       # now when it is swapped eliminate the first as usual                      
                       self.K  = np.matrix(self.K[1:][:,1:])                
                       f = np.matrix(self.Kinv[0, 1:])
                       self.Kinv = np.matrix(self.Kinv[1:, 1:] - (f.T*f) / (self.Kinv[0, 0]))
                       
                      
                       # shuffle dictionary accordingly...
                       self.Dict = np.array(np.vstack([np.vstack([self.Dict[1:ind-1,:], self.Dict[0,:]]), self.Dict[ind:,:]]))
                       self.Targ = np.array(np.vstack([np.vstack([self.Targ[1:ind-1], self.Targ[0]]), self.Targ[ind:]]))
                                              
                       self.K = np.array(self.K)
                       self.Kinv = np.array(self.Kinv)
                                                                                                        
                       self.eliminatedFlag = True 
                       self.numel = self.numel - 1
                       
                       self.dindex = self.dindex-1
                       self.dindex[ind-1] = self.maxsize
                       
                 else:
                     # FIFO: simply free some room by eliminating the OLDEST entry
                     self.K  = self.K[1:][:,1:]                
                        
                     f = np.matrix(self.Kinv[0][1:])
                     self.Kinv = self.Kinv[1:][:,1:] - (f.T*f) / (self.Kinv[0][0])
                            
                     self.Dict = np.array(self.Dict[1:,:][:])
                     self.Targ = np.array(self.Targ[1:])
                     self.K = np.array(self.K)
                     self.Kinv = np.array(self.Kinv)
                                                              
                     self.eliminatedFlag = True 
                     self.numel = self.numel - 1
                     
                     self.dindex = self.dindex-1
                     self.dindex = np.hstack([self.dindex[1:], self.maxsize])
                     
     
     def query(self, sample):  
         return self.kernel_function(sample, self.Dict).T



