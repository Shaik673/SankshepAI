import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import SocialAuthButtons from '../components/auth/SocialAuthButtons';

describe('SocialAuthButtons Component', () => {
  it('renders Google, GitHub, and LinkedIn social login buttons', () => {
    render(<SocialAuthButtons mode="login" />);

    expect(screen.getByLabelText(/Continue with Google/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Continue with GitHub/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Continue with LinkedIn/i)).toBeInTheDocument();
  });

  it('renders sign up labels when mode is signup', () => {
    render(<SocialAuthButtons mode="signup" />);

    expect(screen.getByLabelText(/Sign up with Google/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sign up with GitHub/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sign up with LinkedIn/i)).toBeInTheDocument();
  });
});

