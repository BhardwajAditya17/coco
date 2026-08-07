const prisma = require('../config/prisma');
const { initiateAadhaarOtp, verifyAadhaarOtp } = require('../services/kycService');

/**
 * @desc    Trigger e-KYC OTP
 * @route   POST /api/v1/kyc/initiate-otp
 * @access  Private
 */
const initiateOtp = async (req, res, next) => {
  try {
    const { aadhaar_number } = req.body;
    const userId = req.user.id;

    if (!aadhaar_number || !/^\d{12}$/.test(aadhaar_number)) {
      return res.status(400).json({
        success: false,
        message: 'A valid 12-digit identification number is required.',
      });
    }

    // Call service layer
    const providerResult = await initiateAadhaarOtp(aadhaar_number);

    // Save temporary session token & hash; plain-text ID is discarded
    await prisma.user.update({
      where: { id: userId },
      data: {
        aadhaar_status: 'otp_sent',
        kyc_client_ref: providerResult.client_ref_id,
        id_hash: providerResult.id_hash,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'OTP has been sent to the mobile number registered with government records.',
      client_ref_id: providerResult.client_ref_id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify e-KYC OTP
 * @route   POST /api/v1/kyc/verify-otp
 * @access  Private
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { otp, client_ref_id } = req.body;
    const userId = req.user.id;

    if (!otp || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'A valid 6-digit OTP is required.',
      });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { kyc_client_ref: true },
    });

    const activeClientRef = client_ref_id || currentUser?.kyc_client_ref;

    if (!activeClientRef) {
      return res.status(400).json({
        success: false,
        message: 'No active OTP verification session found. Please initiate OTP request first.',
      });
    }

    // Call provider verification
    const verificationResult = await verifyAadhaarOtp(activeClientRef, otp);

    // Update DB record upon verification success
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        aadhaar_status: 'verified',
        kyc_reference_id: verificationResult.reference_id,
        kyc_client_ref: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        aadhaar_status: true,
        fee_status: true,
        kyc_reference_id: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Identity verification complete.',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initiateOtp,
  verifyOtp,
};