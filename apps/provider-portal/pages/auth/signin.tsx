import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import Head from 'next/head';

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('Click a button to login');

  const handleLogin = async (userType: string) => {
    const emails: Record<string, string> = { provider:'provider@attending.dev', admin:'admin@attending.dev', nurse:'nurse@attending.dev' };
    setIsLoading(true);
    setStatus('Logging in...');
    
    const result = await signIn('credentials', { email: emails[userType], password: 'password', redirect: false });
    
    if (result?.ok) {
      setStatus('Success! Redirecting...');
      window.location.href = '/';
    } else {
      setStatus('Login failed: ' + (result?.error || 'Unknown error'));
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head><title>Sign In - ATTENDING AI</title></Head>
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#667eea,#764ba2)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
        <div style={{background:'white',borderRadius:'1rem',padding:'2rem',width:'100%',maxWidth:'400px',textAlign:'center'}}>
          <h1 style={{margin:'0 0 0.5rem 0'}}>🏥 ATTENDING AI</h1>
          <p style={{color:'#6b7280',margin:'0 0 1.5rem 0'}}>Provider Portal</p>
          <p style={{fontSize:'0.75rem',background:'#f0f9ff',padding:'0.5rem',borderRadius:'0.25rem',marginBottom:'1rem'}}>{status}</p>
          <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
            <button onClick={()=>handleLogin('provider')} disabled={isLoading} style={{padding:'1rem',fontSize:'1rem',background:'#667eea',color:'white',border:'none',borderRadius:'0.5rem',cursor:'pointer'}}>Login as Provider</button>
            <button onClick={()=>handleLogin('nurse')} disabled={isLoading} style={{padding:'1rem',fontSize:'1rem',background:'#059669',color:'white',border:'none',borderRadius:'0.5rem',cursor:'pointer'}}>Login as Nurse</button>
            <button onClick={()=>handleLogin('admin')} disabled={isLoading} style={{padding:'1rem',fontSize:'1rem',background:'#7c3aed',color:'white',border:'none',borderRadius:'0.5rem',cursor:'pointer'}}>Login as Admin</button>
          </div>
        </div>
      </div>
    </>
  );
}
