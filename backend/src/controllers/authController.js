const User = require('../models/User');
const Connection = require('../models/Connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'chronoguard_default_secret_key_123';
const JWT_EXPIRES_IN = '7d';

// Generate Token helper
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Register User
exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      name: name || email.split('@')[0]
    });

    await user.save();

    const token = generateToken(user._id);

    return res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        googleConnected: user.googleConnected
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        googleConnected: user.googleConnected
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
};

// Get User Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: 'Server error retrieving profile.', error: error.message });
  }
};

// Generate Google Auth Redirection URL
exports.googleAuth = (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    return res.status(500).json({ message: "Google client ID or redirect URI is not configured on the backend." });
  }

  const scope = encodeURIComponent("https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.readonly");
  const state = req.user.id;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;

  return res.status(200).json({ url });
};

// Handle Google OAuth Callback (code exchange)
exports.googleCallback = async (req, res) => {
  const { code, state: userId } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (!code || !userId) {
    return res.redirect(`${frontendUrl}/settings?status=error&message=Missing+code+or+user+id`);
  }

  try {
    const axios = require('axios');
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token, expires_in, scope } = response.data;

    const connectionData = {
      accessToken: access_token,
      expiryDate: Date.now() + (expires_in * 1000),
      scopes: scope ? scope.split(' ') : []
    };

    // Only update refresh token if Google returns it (usually only on first consent)
    if (refresh_token) {
      connectionData.refreshToken = refresh_token;
    }

    await Connection.findOneAndUpdate(
      { user: userId },
      connectionData,
      { upsert: true }
    );

    await User.findByIdAndUpdate(userId, { googleConnected: true });

    return res.redirect(`${frontendUrl}/settings?status=success`);
  } catch (error) {
    console.error("Google OAuth Exchange Error:", error.response?.data || error.message);
    const errDetails = error.response?.data?.error_description || error.message;
    return res.redirect(`${frontendUrl}/settings?status=error&message=${encodeURIComponent(errDetails)}`);
  }
};

// Disconnect Google Account
exports.googleDisconnect = async (req, res) => {
  try {
    await Connection.findOneAndDelete({ user: req.user.id });
    await User.findByIdAndUpdate(req.user.id, { googleConnected: false });
    return res.status(200).json({ message: "Google account disconnected successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Server error during disconnect.", error: error.message });
  }
};

// Update User Preferences
exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { syncOnLoad, emailAlerts, focusBufferMinutes, highPriorityKeywords } = req.body;

    const updates = {};
    if (syncOnLoad !== undefined) updates.syncOnLoad = syncOnLoad;
    if (emailAlerts !== undefined) updates.emailAlerts = emailAlerts;
    if (focusBufferMinutes !== undefined) updates.focusBufferMinutes = focusBufferMinutes;
    if (highPriorityKeywords !== undefined) updates.highPriorityKeywords = highPriorityKeywords;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    ).select('-password');

    return res.status(200).json({ message: "Preferences updated successfully.", user });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update preferences.", error: error.message });
  }
};
