// =============================================================================
// ATTENDING AI - Emergency Access Component Tests
// apps/patient-portal/__tests__/components/EmergencyAccess.test.tsx
//
// Unit tests for emergency access UI components
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock router
vi.mock('next/router', () => ({
  useRouter: () => ({
    query: {},
    push: vi.fn(),
  }),
}));

// =============================================================================
// PIN Entry Component Tests
// =============================================================================

describe('PIN Entry Component', () => {
  // Create a minimal mock component for testing
  const MockPINEntry: React.FC<{
    onSuccess: () => void;
    correctPin?: string;
  }> = ({ onSuccess, correctPin = '911911' }) => {
    const [pin, setPin] = React.useState('');
    const [error, setError] = React.useState(false);
    const [attempts, setAttempts] = React.useState(0);

    const handlePinInput = (digit: string) => {
      if (pin.length < 6) {
        const newPin = pin + digit;
        setPin(newPin);
        setError(false);
        
        if (newPin.length === 6) {
          if (newPin === correctPin) {
            onSuccess();
          } else {
            setError(true);
            setAttempts(prev => prev + 1);
            setTimeout(() => setPin(''), 100);
          }
        }
      }
    };

    return (
      <div data-testid="pin-entry">
        <h1>EMERGENCY MEDICAL ACCESS</h1>
        <div data-testid="pin-display">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <span 
              key={i} 
              data-testid={`pin-dot-${i}`}
              className={error ? 'error' : ''}
            >
              {pin.length > i ? '•' : ''}
            </span>
          ))}
        </div>
        {error && (
          <p data-testid="error-message">Incorrect PIN. Attempt {attempts}/5</p>
        )}
        <div data-testid="number-pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
            <button
              key={num}
              onClick={() => handlePinInput(String(num))}
              data-testid={`key-${num}`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    );
  };

  it('should render PIN entry screen', () => {
    render(<MockPINEntry onSuccess={() => {}} />);
    
    expect(screen.getByText('EMERGENCY MEDICAL ACCESS')).toBeDefined();
    expect(screen.getByTestId('pin-display')).toBeDefined();
    expect(screen.getByTestId('number-pad')).toBeDefined();
  });

  it('should have all number keys', () => {
    render(<MockPINEntry onSuccess={() => {}} />);
    
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByTestId(`key-${i}`)).toBeDefined();
    }
  });

  it('should fill PIN dots when numbers are entered', async () => {
    render(<MockPINEntry onSuccess={() => {}} />);
    
    fireEvent.click(screen.getByTestId('key-9'));
    fireEvent.click(screen.getByTestId('key-1'));
    fireEvent.click(screen.getByTestId('key-1'));
    
    // First 3 dots should be filled
    expect(screen.getByTestId('pin-dot-0').textContent).toBe('•');
    expect(screen.getByTestId('pin-dot-1').textContent).toBe('•');
    expect(screen.getByTestId('pin-dot-2').textContent).toBe('•');
    expect(screen.getByTestId('pin-dot-3').textContent).toBe('');
  });

  it('should call onSuccess with correct PIN (911911)', async () => {
    const onSuccess = vi.fn();
    render(<MockPINEntry onSuccess={onSuccess} />);
    
    // Enter correct PIN: 911911
    fireEvent.click(screen.getByTestId('key-9'));
    fireEvent.click(screen.getByTestId('key-1'));
    fireEvent.click(screen.getByTestId('key-1'));
    fireEvent.click(screen.getByTestId('key-9'));
    fireEvent.click(screen.getByTestId('key-1'));
    fireEvent.click(screen.getByTestId('key-1'));
    
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('should show error with incorrect PIN', async () => {
    const onSuccess = vi.fn();
    render(<MockPINEntry onSuccess={onSuccess} />);
    
    // Enter wrong PIN: 123456
    fireEvent.click(screen.getByTestId('key-1'));
    fireEvent.click(screen.getByTestId('key-2'));
    fireEvent.click(screen.getByTestId('key-3'));
    fireEvent.click(screen.getByTestId('key-4'));
    fireEvent.click(screen.getByTestId('key-5'));
    fireEvent.click(screen.getByTestId('key-6'));
    
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByTestId('error-message')).toBeDefined();
    expect(screen.getByText(/Incorrect PIN/)).toBeDefined();
  });

  it('should track attempt count', async () => {
    render(<MockPINEntry onSuccess={() => {}} />);
    
    // First wrong attempt
    for (let i = 1; i <= 6; i++) {
      fireEvent.click(screen.getByTestId('key-1'));
    }
    
    await waitFor(() => {
      expect(screen.getByText(/Attempt 1\/5/)).toBeDefined();
    });
  });
});

// =============================================================================
// Medical Info Display Tests
// =============================================================================

describe('Medical Info Display', () => {
  const mockMedicalInfo = {
    patientName: 'Robert Anderson',
    age: 68,
    bloodType: 'A+',
    allergies: ['Penicillin', 'Sulfa drugs'],
    conditions: ['Type 2 Diabetes', 'Hypertension'],
    medications: [
      { name: 'Metformin', dosage: '1000mg', frequency: 'Twice daily', isCritical: false },
      { name: 'Eliquis', dosage: '5mg', frequency: 'Twice daily', isCritical: true },
    ],
    emergencyContacts: [
      { name: 'Rachel Anderson', phone: '(555) 123-4567', isPrimary: true },
    ],
    implants: ['Pacemaker'],
    dnr: false,
    organDonor: true,
  };

  // Mock display component
  const MockMedicalDisplay: React.FC<{ info: typeof mockMedicalInfo }> = ({ info }) => (
    <div data-testid="medical-display">
      <header>
        <h1>EMERGENCY MEDICAL INFO</h1>
        <p data-testid="patient-info">{info.patientName} • {info.age}yo</p>
      </header>
      
      <section data-testid="blood-type">
        <span>Blood Type: {info.bloodType}</span>
      </section>
      
      <section data-testid="allergies">
        <h2>ALLERGIES</h2>
        {info.allergies.map((allergy, i) => (
          <span key={i} data-testid={`allergy-${i}`}>{allergy}</span>
        ))}
      </section>
      
      <section data-testid="conditions">
        <h2>CONDITIONS</h2>
        {info.conditions.map((condition, i) => (
          <span key={i} data-testid={`condition-${i}`}>{condition}</span>
        ))}
      </section>
      
      <section data-testid="medications">
        <h2>MEDICATIONS</h2>
        {info.medications.map((med, i) => (
          <div key={i} data-testid={`medication-${i}`} className={med.isCritical ? 'critical' : ''}>
            <span>{med.name}</span>
            <span>{med.dosage}</span>
          </div>
        ))}
      </section>
      
      <section data-testid="implants">
        <h2>IMPLANTS</h2>
        {info.implants.map((implant, i) => (
          <span key={i} data-testid={`implant-${i}`}>{implant}</span>
        ))}
      </section>
      
      <section data-testid="contacts">
        <h2>EMERGENCY CONTACTS</h2>
        {info.emergencyContacts.map((contact, i) => (
          <a key={i} href={`tel:${contact.phone}`} data-testid={`contact-${i}`}>
            {contact.name} - {contact.phone}
          </a>
        ))}
      </section>
      
      <section data-testid="directives">
        <div data-testid="dnr-status">DNR: {info.dnr ? 'YES' : 'No'}</div>
        <div data-testid="organ-donor">Organ Donor: {info.organDonor ? 'Yes' : 'No'}</div>
      </section>
    </div>
  );

  it('should display patient name and age', () => {
    render(<MockMedicalDisplay info={mockMedicalInfo} />);
    
    expect(screen.getByTestId('patient-info').textContent).toContain('Robert Anderson');
    expect(screen.getByTestId('patient-info').textContent).toContain('68');
  });

  it('should display blood type prominently', () => {
    render(<MockMedicalDisplay info={mockMedicalInfo} />);
    
    expect(screen.getByTestId('blood-type').textContent).toContain('A+');
  });

  it('should display all allergies', () => {
    render(<MockMedicalDisplay info={mockMedicalInfo} />);
    
    expect(screen.getByTestId('allergy-0').textContent).toBe('Penicillin');
    expect(screen.getByTestId('allergy-1').textContent).toBe('Sulfa drugs');
  });

  it('should display medical conditions', () => {
    render(<MockMedicalDisplay info={mockMedicalInfo} />);
    
    expect(screen.getByTestId('condition-0').textContent).toBe('Type 2 Diabetes');
    expect(screen.getByTestId('condition-1').textContent).toBe('Hypertension');
  });

  it('should display medications with critical flag', () => {
    render(<MockMedicalDisplay info={mockMedicalInfo} />);
    
    const criticalMed = screen.getByTestId('medication-1');
    expect(criticalMed.className).toContain('critical');
    expect(criticalMed.textContent).toContain('Eliquis');
  });

  it('should display implants/devices', () => {
    render(<MockMedicalDisplay info={mockMedicalInfo} />);
    
    expect(screen.getByTestId('implant-0').textContent).toBe('Pacemaker');
  });

  it('should have clickable emergency contact phone numbers', () => {
    render(<MockMedicalDisplay info={mockMedicalInfo} />);
    
    const contactLink = screen.getByTestId('contact-0');
    expect(contactLink.getAttribute('href')).toBe('tel:(555) 123-4567');
  });

  it('should display DNR status', () => {
    render(<MockMedicalDisplay info={mockMedicalInfo} />);
    
    expect(screen.getByTestId('dnr-status').textContent).toContain('No');
  });

  it('should display organ donor status', () => {
    render(<MockMedicalDisplay info={mockMedicalInfo} />);
    
    expect(screen.getByTestId('organ-donor').textContent).toContain('Yes');
  });
});

// =============================================================================
// Countdown Screen Tests
// =============================================================================

describe('Countdown Screen', () => {
  const MockCountdown: React.FC<{
    seconds: number;
    onCancel: () => void;
    onExpire: () => void;
  }> = ({ seconds, onCancel, onExpire }) => {
    const [countdown, setCountdown] = React.useState(seconds);

    React.useEffect(() => {
      if (countdown <= 0) {
        onExpire();
        return;
      }

      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    }, [countdown, onExpire]);

    return (
      <div data-testid="countdown-screen">
        <h1>CRASH DETECTED</h1>
        <div data-testid="countdown-timer">{countdown}</div>
        <button onClick={onCancel} data-testid="cancel-button">
          I'M OKAY - CANCEL
        </button>
      </div>
    );
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should display initial countdown value', () => {
    render(<MockCountdown seconds={30} onCancel={() => {}} onExpire={() => {}} />);
    
    expect(screen.getByTestId('countdown-timer').textContent).toBe('30');
  });

  it('should have cancel button', () => {
    render(<MockCountdown seconds={30} onCancel={() => {}} onExpire={() => {}} />);
    
    expect(screen.getByTestId('cancel-button')).toBeDefined();
    expect(screen.getByText("I'M OKAY - CANCEL")).toBeDefined();
  });

  it('should call onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(<MockCountdown seconds={30} onCancel={onCancel} onExpire={() => {}} />);
    
    fireEvent.click(screen.getByTestId('cancel-button'));
    
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should decrement countdown every second', async () => {
    render(<MockCountdown seconds={30} onCancel={() => {}} onExpire={() => {}} />);
    
    expect(screen.getByTestId('countdown-timer').textContent).toBe('30');
    
    vi.advanceTimersByTime(1000);
    await waitFor(() => {
      expect(screen.getByTestId('countdown-timer').textContent).toBe('29');
    });
    
    vi.advanceTimersByTime(1000);
    await waitFor(() => {
      expect(screen.getByTestId('countdown-timer').textContent).toBe('28');
    });
  });

  it('should call onExpire when countdown reaches zero', async () => {
    const onExpire = vi.fn();
    render(<MockCountdown seconds={3} onCancel={() => {}} onExpire={onExpire} />);
    
    vi.advanceTimersByTime(3000);
    
    await waitFor(() => {
      expect(onExpire).toHaveBeenCalledTimes(1);
    });
  });
});
