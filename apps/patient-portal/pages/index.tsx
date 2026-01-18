import React from 'react';
import Head from 'next/head';
import ImprovedPatientPortal from '../components/ImprovedPatientPortal';

export default function PatientPortalHome() {
  return (
    <>
      <Head>
        <title>ATTENDING AI - Patient Portal</title>
        <meta name="description" content="Secure patient portal for medical care" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <ImprovedPatientPortal />
    </>
  );
}
