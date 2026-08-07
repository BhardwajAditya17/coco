const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = process.env.KYC_PROVIDER_BASE_URL || 'https://api.sandbox.co.in';

/**
 * Generates a SHA-256 hash of raw identity numbers for compliance auditing
 */
const generateIdHash = (idNumber) => {
  return crypto.createHash('sha256').update(idNumber).digest('hex');
};

/**
 * Retrieves a Bearer token from the provider authentication endpoint
 */
const getAccessToken = async () => {
  try {
    const response = await axios.post(
      `${BASE_URL}/authenticate`,
      {},
      {
        headers: {
          'x-api-key': process.env.KYC_API_KEY,
          'x-api-secret': process.env.KYC_API_SECRET,
          'x-api-version': '1.0',
        },
      }
    );

    if (!response.data?.access_token) {
      throw new Error('Failed to retrieve authentication token from KYC provider.');
    }

    return response.data.access_token;
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    throw new Error(`KYC Authentication Failed: ${message}`);
  }
};

/**
 * Step 1: Initiates OTP request with official e-KYC gateway
 */
const initiateAadhaarOtp = async (aadhaarNumber) => {
  const token = await getAccessToken();
  const idHash = generateIdHash(aadhaarNumber);

  try {
    const response = await axios.post(
      `${BASE_URL}/kyc/aadhaar/okyc/otp`,
      { aadhaar_number: aadhaarNumber },
      {
        headers: {
          Authorization: token,
          'x-api-key': process.env.KYC_API_KEY,
          'x-api-version': '1.0',
        },
      }
    );

    const payload = response.data;

    if (payload.code !== 200 || !payload.data?.ref_id) {
      throw new Error(payload.message || 'Verification gateway failed to initiate OTP.');
    }

    return {
      success: true,
      client_ref_id: payload.data.ref_id,
      id_hash: idHash,
    };
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    throw new Error(`KYC Gateway Error: ${message}`);
  }
};

/**
 * Step 2: Validates user submitted OTP with e-KYC gateway
 */
const verifyAadhaarOtp = async (clientRefId, otp) => {
  const token = await getAccessToken();

  try {
    const response = await axios.post(
      `${BASE_URL}/kyc/aadhaar/okyc/otp/verify`,
      {
        ref_id: clientRefId,
        otp: otp,
      },
      {
        headers: {
          Authorization: token,
          'x-api-key': process.env.KYC_API_KEY,
          'x-api-version': '1.0',
        },
      }
    );

    const payload = response.data;

    if (payload.code !== 200 || payload.data?.status !== 'VALID') {
      throw new Error(payload.message || 'Invalid or expired OTP.');
    }

    return {
      success: true,
      reference_id: payload.data.ref_id || clientRefId,
    };
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    throw new Error(`KYC Verification Error: ${message}`);
  }
};

module.exports = {
  initiateAadhaarOtp,
  verifyAadhaarOtp,
  generateIdHash,
};