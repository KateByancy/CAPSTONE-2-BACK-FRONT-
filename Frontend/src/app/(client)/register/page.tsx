"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import MarcBrand from '@/components/MarcBrand';
import { apiFetch, getApiUrl, readApiResponse } from '@/lib/api';

interface ClientAccount {
  id: number;
  fullname: string;
  email: string;
  phone: string;
  address: string;
  landmark?: string;
}

interface RegisterViewProps {
  onRegisterSuccess?: (client: ClientAccount) => void;
  onBackToMain?: () => void;
}

interface RegisterResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: ClientAccount;
}

interface PsgcBarangay {
  code: string;
  name: string;
  province?: { name?: string } | string | null;
  city_municipality?: { name?: string } | string | null;
}

const VISAYAS_REGION_CODES = ['0600000000', '0700000000', '0800000000', '1800000000'];
const VISAYAS_ADDRESS_FALLBACKS = [
  'Cordova, Cebu',
];
let cachedVisayasBarangays: string[] | null = null;

const getLocationName = (location: PsgcBarangay['province'] | PsgcBarangay['city_municipality']) => {
  if (!location) return '';
  return typeof location === 'string' ? location : location.name || '';
};

const loadVisayasBarangayAddresses = async () => {
  if (cachedVisayasBarangays) return cachedVisayasBarangays;

  const responses = await Promise.allSettled(
    VISAYAS_REGION_CODES.map(async (regionCode) => {
      const response = await fetch(`https://psgc.cloud/api/v2/regions/${regionCode}/barangays`);
      if (!response.ok) return [];
      const result: { data?: PsgcBarangay[] } = await response.json();
      return result.data || [];
    })
  );

  const barangays = responses.flatMap((response) => response.status === 'fulfilled' ? response.value : []);
  cachedVisayasBarangays = Array.from(new Set([...VISAYAS_ADDRESS_FALLBACKS, ...barangays.map((barangay) => {
    const cityMunicipality = getLocationName(barangay.city_municipality);
    const province = getLocationName(barangay.province);
    return [barangay.name, cityMunicipality, province].filter(Boolean).join(', ');
  }).filter(Boolean)])).sort((first, second) => first.localeCompare(second));

  return cachedVisayasBarangays;
};

export default function ClientRegisterPage({ onRegisterSuccess, onBackToMain }: RegisterViewProps) {
  const router = useRouter();

  // Input States
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [projectAddress, setProjectAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [visayasBarangayAddresses, setVisayasBarangayAddresses] = useState<string[]>([]);
  const [addressLookupLoading, setAddressLookupLoading] = useState(false);
  const addressSuggestions = useMemo(() => {
    const typedAddress = projectAddress.trim();
    if (typedAddress.length < 2) return [];

    const search = typedAddress.toLowerCase();
    const matchingAddresses = visayasBarangayAddresses.filter((suggestion) =>
      suggestion.toLowerCase().includes(search)
    );

    return matchingAddresses.sort((first, second) => {
      const firstBarangay = first.split(',')[0].trim().toLowerCase();
      const secondBarangay = second.split(',')[0].trim().toLowerCase();
      const firstStartsWithBarangay = firstBarangay.startsWith(search);
      const secondStartsWithBarangay = secondBarangay.startsWith(search);
      if (firstStartsWithBarangay !== secondStartsWithBarangay) return firstStartsWithBarangay ? -1 : 1;

      const firstStartsWithAddress = first.toLowerCase().startsWith(search);
      const secondStartsWithAddress = second.toLowerCase().startsWith(search);
      if (firstStartsWithAddress !== secondStartsWithAddress) return firstStartsWithAddress ? -1 : 1;

      return first.localeCompare(second);
    }).slice(0, 8);
  }, [projectAddress, visayasBarangayAddresses]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    if ([fullName, phoneNumber, projectAddress, landmark, email, password, confirmPassword].some(value => !value.trim())) {
      setError('Please fill in every field. Blank spaces are not accepted.');
      return;
    }
    setIsLoading(true);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Confirm Password must match Password.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiFetch(`${getApiUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: fullName.trim(),
          phone: phoneNumber.trim(),
          address: projectAddress.trim(),
          landmark: landmark.trim(),
          email: email.trim(),
          password,
        }),
      });
      const result = await readApiResponse<RegisterResponse>(response);

      if (!response.ok || !result.success || !result.user) {
        throw new Error(result.message || 'Unable to create your account.');
      }

      if (onRegisterSuccess) {
        onRegisterSuccess(result.user);
      } else {
        router.replace('/login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account.');
    } finally {
      setIsLoading(false);
    }


  };

  const handleReturnToMain = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onBackToMain) {
      onBackToMain();
    } else {
      router.push('/');
    }
  };

  useEffect(() => {
    if (projectAddress.trim().length < 2) return;
    if (cachedVisayasBarangays) {
      const cachedAddresses: string[] = cachedVisayasBarangays || [];
      const cachedUpdate = window.setTimeout(() => setVisayasBarangayAddresses(cachedAddresses), 0);
      return () => window.clearTimeout(cachedUpdate);
    }

    let isCurrent = true;
    const loadingUpdate = window.setTimeout(() => setAddressLookupLoading(true), 0);
    void loadVisayasBarangayAddresses()
      .then((addresses) => {
        if (isCurrent) setVisayasBarangayAddresses(addresses);
      })
      .catch(() => {
        if (isCurrent) setVisayasBarangayAddresses([]);
      })
      .finally(() => {
        if (isCurrent) setAddressLookupLoading(false);
      });

    return () => {
      isCurrent = false;
      window.clearTimeout(loadingUpdate);
    };
  }, [projectAddress]);

  return (
    <div className="marc-login-page marc-registration-page">
      <div className="marc-login-panel marc-registration-panel">
        <section className="marc-login-form-panel marc-registration-form-panel">
          <button type="button" className="marc-return" onClick={handleReturnToMain}>Return Main</button>
          <MarcBrand />
          <h1>Create Account</h1>
          <p className="marc-registration-intro">All fields are required.</p>
          <form onSubmit={handleRegister} className="marc-login-form marc-registration-form" aria-label="Create your client account">
            {error && <p role="alert" className="marc-form-error">{error}</p>}
            <fieldset disabled={isLoading} className="marc-registration-fields">
              <div className="marc-registration-field">
                <label htmlFor="register-name">Full Name</label>
                <input id="register-name" name="fullname" type="text" autoComplete="name" placeholder="Enter your Full name" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div className="marc-registration-field">
                <label htmlFor="register-phone">Phone Number</label>
                <input id="register-phone" name="phone" type="tel" autoComplete="tel" placeholder="Enter your mobile number" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} required />
              </div>
              <div className="marc-registration-field marc-registration-full">
                <label htmlFor="register-address">Project Address</label>
                <input id="register-address" name="address" type="text" autoComplete="street-address" list="project-address-suggestions" value={projectAddress} onChange={e => setProjectAddress(e.target.value)} placeholder="e.g. Unit/House No., Street, Barangay, City, Province" aria-describedby="register-address-help" required />
                <datalist id="project-address-suggestions">{addressSuggestions.map(suggestion => <option key={suggestion} value={suggestion} />)}</datalist>
                <p id="register-address-help" className="marc-field-help" role="status">{addressLookupLoading ? 'Loading address suggestions...' : 'Include your house or building number and street.'}</p>
              </div>
              <div className="marc-registration-field marc-registration-full">
                <label htmlFor="register-landmark">Nearest Landmark</label>
                <input id="register-landmark" name="landmark" type="text" placeholder="e.g. Near Grand Mall, beside Shell station" value={landmark} onChange={e => setLandmark(e.target.value)} required />
              </div>
              <div className="marc-registration-field marc-registration-full">
                <label htmlFor="register-email">Email</label>
                <input id="register-email" name="email" type="email" autoComplete="email" placeholder="Enter your email address" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="marc-registration-field">
                <label htmlFor="register-password">Password</label>
                <div className="marc-password">
                  <input id="register-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} minLength={8} aria-describedby="register-password-help" required />
                  <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </div>
                <p id="register-password-help" className="marc-field-help">Use at least 8 characters.</p>
              </div>
              <div className="marc-registration-field">
                <label htmlFor="register-confirm">Confirm Password</label>
                <div className="marc-password">
                  <input id="register-confirm" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Re-enter your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={8} aria-describedby="register-confirm-help" aria-invalid={Boolean(confirmPassword && password !== confirmPassword)} required />
                  <button type="button" aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </div>
                <p id="register-confirm-help" className="marc-field-help">{confirmPassword && password !== confirmPassword ? 'Passwords do not match.' : 'Re-enter your password.'}</p>
              </div>
            </fieldset>
            <button type="submit" className="marc-primary marc-login-submit" disabled={isLoading}>{isLoading ? 'Creating account...' : 'Create Account'}</button>
          </form>
          <p className="marc-register-link">Already have an account? <button type="button" onClick={() => router.push('/?screen=login')}>Sign in</button></p>
        </section>
        <div className="marc-login-photo" role="img" aria-label="Interior design inspiration" />
      </div>
    </div>
  );
}
