const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('./logger');

/**
 * JWT Utilities for token handling
 */
class JWTUtils {
  /**
   * Generate a JWT token
   * @param {Object} payload - Token payload
   * @param {string} expiresIn - Token expiration
   * @returns {string} JWT token
   */
  static generateToken(payload, expiresIn = config.jwt.expiresIn) {
    try {
      return jwt.sign(payload, config.jwt.secret, { expiresIn });
    } catch (error) {
      logger.error('Error generating JWT token:', error);
      throw new Error('Failed to generate token');
    }
  }

  /**
   * Generate a refresh token
   * @param {Object} payload - Token payload
   * @returns {string} Refresh JWT token
   */
  static generateRefreshToken(payload) {
    try {
      return jwt.sign(payload, config.jwt.secret, { 
        expiresIn: config.jwt.refreshExpiresIn 
      });
    } catch (error) {
      logger.error('Error generating refresh token:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Verify and decode a JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        logger.error('Error verifying JWT token:', error);
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Decode token without verification (for debugging)
   * @param {string} token - JWT token to decode
   * @returns {Object} Decoded token payload
   */
  static decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      logger.error('Error decoding JWT token:', error);
      throw new Error('Failed to decode token');
    }
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token to check
   * @returns {boolean} True if token is expired
   */
  static isTokenExpired(token) {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return true;
      }
      
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Extract user ID from token
   * @param {string} token - JWT token
   * @returns {string} User ID
   */
  static extractUserId(token) {
    try {
      const decoded = this.verifyToken(token);
      const userId = decoded.sub || decoded.userId || decoded.id;
      
      if (!userId) {
        throw new Error('User ID not found in token');
      }
      
      return userId;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Extract user info from token
   * @param {string} token - JWT token
   * @returns {Object} User information
   */
  static extractUserInfo(token) {
    try {
      const decoded = this.verifyToken(token);
      return {
        id: decoded.sub || decoded.userId || decoded.id,
        username: decoded.username || decoded.preferred_username,
        email: decoded.email,
        roles: decoded.roles || [],
        scope: decoded.scope || '',
        iat: decoded.iat,
        exp: decoded.exp
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a token for testing purposes
   * @param {string} userId - User ID
   * @param {Object} additionalClaims - Additional claims
   * @returns {string} JWT token
   */
  static createTestToken(userId, additionalClaims = {}) {
    const payload = {
      sub: userId,
      username: `test-user-${userId}`,
      email: `user-${userId}@example.com`,
      roles: ['user'],
      iat: Math.floor(Date.now() / 1000),
      ...additionalClaims
    };
    
    return this.generateToken(payload);
  }
}

module.exports = JWTUtils;
