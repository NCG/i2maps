import numpy as np


class Gaussian:
    """
    A Gaussian kernel.
    """
    
    def __init__(self, sigma=0.5):
        self.sigma = sigma
    
    def __call__(self, X, Z):
        """
        Computes the Gaussian kernel for the matrices X and Z.
        """
        # make sure X and Z are Numpy matrices
        if not isinstance(X, np.matrix):
            X = np.matrix(X)
        if not isinstance(Z, np.matrix):
            Z = np.matrix(Z)
        n, m = X.shape[0], Z.shape[0]
        XX = np.multiply(X, X)
        XX = XX.sum(axis = 1)
        ZZ = np.multiply(Z, Z)
        ZZ = ZZ.sum(axis = 1)
        d = np.tile(XX, (1, m)) + np.tile(ZZ.T, (n, 1)) - 2 * X * Z.T
        Kexpd = np.exp(-d.T / (2 * self.sigma * self.sigma));
        return np.array(Kexpd);


