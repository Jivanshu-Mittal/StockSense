import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

export const AuthScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Password reset states
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'password'>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetMessageType, setResetMessageType] = useState<'success' | 'error' | null>(null);

  const login = useAuthStore(state => state.login);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // Form Data is required for OAuth2PasswordRequestForm in FastAPI
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        const response = await apiClient.post('/auth/login', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        await login(response.data.access_token);
      } else {
        // Signup expects JSON payload
        await apiClient.post('/auth/signup', { email, password });
        Alert.alert('Success', 'Account created! Please log in.', [
          { text: 'OK', onPress: () => setIsLogin(true) }
        ]);
      }
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'An error occurred';
      // Handle FastAPI validation error formatting (arrays)
      const displayMsg = Array.isArray(msg) ? msg[0].msg : msg;
      Alert.alert('Error', displayMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (step: 'email' | 'otp' | 'password') => {
    setResetMessage('');
    setResetMessageType(null);
    setResetLoading(true);

    try {
      if (step === 'email') {
        if (!resetEmail) {
          Alert.alert('Error', 'Please enter your email');
          return;
        }

        await apiClient.post('/auth/forgot-password', { email: resetEmail });
        setResetMessage('If the email exists, an OTP has been sent');
        setResetMessageType('success');
        setResetStep('otp');
      } else if (step === 'otp') {
        if (!otp || otp.length !== 6) {
          Alert.alert('Error', 'Please enter a valid 6-digit OTP');
          return;
        }

        if (!newPassword || newPassword.length < 8) {
          Alert.alert('Error', 'Password must be at least 8 characters');
          return;
        }

        if (newPassword !== confirmPassword) {
          Alert.alert('Error', 'Passwords do not match');
          return;
        }

        await apiClient.post('/auth/reset-password-otp', {
          email: resetEmail,
          otp,
          new_password: newPassword
        });

        setResetMessage('Password reset successful! You can now log in with your new password.');
        setResetMessageType('success');
        setResetStep('password');
      }
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'An error occurred';
      // Handle FastAPI validation error formatting (arrays)
      const displayMsg = Array.isArray(msg) ? msg[0].msg : msg;
      setResetMessage(displayMsg);
      setResetMessageType('error');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {!resetStep && (
        <View style={styles.card}>
          <Text style={styles.title}>StockSense</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Welcome back!' : 'Create your account'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'Sign In' : 'Sign Up'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchMode}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={styles.switchModeText}>
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Log in"}
            </Text>
          </TouchableOpacity>

          {/* Forgot Password Link */}
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => {
              setResetStep('email');
              setResetEmail(email); // Pre-fill with current email if available
            }}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Password Reset Flow */}
      {resetStep === 'email' && (
        <View style={styles.resetContainer}>
          <Text style={styles.resetTitle}>Reset Password</Text>
          <Text style={styles.resetSubtitle}>Enter your email to receive an OTP</Text>

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="email-address"
            value={resetEmail}
            onChangeText={setResetEmail}
            autoFocus
          />

          {resetMessage && (
            <View style={[
              styles.resetMessage,
              resetMessageType === 'success' && styles.resetMessageSuccess,
              resetMessageType === 'error' && styles.resetMessageError
            ]}>
              <Text>{resetMessage}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, resetLoading && styles.buttonLoading]}
            onPress={() => handleResetPassword('email')}
            disabled={resetLoading}
          >
            {resetLoading ? (
              <ActivityIndicator size={20} color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send OTP</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToLogin}
            onPress={() => {
              setResetStep(null);
              setResetEmail('');
            }}
          >
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      )}

      {resetStep === 'otp' && (
        <View style={styles.resetContainer}>
          <Text style={styles.resetTitle}>Verify OTP</Text>
          <Text style={styles.resetSubtitle}>Enter the 6-digit OTP sent to your email</Text>

          <TextInput
            style={styles.input}
            placeholder="OTP"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
            autoFocus
          />

          <TextInput
            style={styles.input}
            placeholder="New Password"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          {resetMessage && (
            <View style={[
              styles.resetMessage,
              resetMessageType === 'success' && styles.resetMessageSuccess,
              resetMessageType === 'error' && styles.resetMessageError
            ]}>
              <Text>{resetMessage}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, resetLoading && styles.buttonLoading]}
            onPress={() => handleResetPassword('otp')}
            disabled={resetLoading}
          >
            {resetLoading ? (
              <ActivityIndicator size={20} color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToLogin}
            onPress={() => {
              setResetStep('email');
              setOtp('');
              setNewPassword('');
              setConfirmPassword('');
            }}
          >
            <Text style={styles.backToLoginText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {resetStep === 'password' && (
        <View style={styles.resetContainer}>
          <Text style={styles.resetTitle}>Password Reset Successful</Text>
          <Text style={styles.resetSubtitle}>Your password has been reset successfully</Text>

          {resetMessage && (
            <View style={[
              styles.resetMessage,
              resetMessageType === 'success' && styles.resetMessageSuccess
            ]}>
              <Text>{resetMessage}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setResetStep(null);
              setResetEmail('');
              setOtp('');
              setNewPassword('');
              setConfirmPassword('');
              setIsLogin(true); // Switch to login tab
            }}
          >
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#1f2937',
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  switchMode: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchModeText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  // Password Reset Styles
  resetContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    padding: 20,
  },
  resetTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  resetSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  resetMessage: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    textAlign: 'center',
  },
  resetMessageSuccess: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
    color: '#15803d',
  },
  resetMessageError: {
    backgroundColor: '#fee2e2',
    borderColor: '#dc2626',
    color: '#991b1b',
    borderWidth: 1,
  },
  backToLogin: {
    marginTop: 24,
    alignItems: 'center',
  },
  backToLoginText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  forgotPassword: {
    marginTop: 24,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonLoading: {
    opacity: 0.7,
  }
});
