# BioMistral-7B Medical AI Integration

This document describes the implementation of the BioMistral-7B medical AI chatbot interface integrated into the ATTENDING provider portal.

## Overview

The BioMistral-7B integration provides a comprehensive patient assessment interface that conducts structured clinical interviews using medical AI. The system follows a 6-phase assessment process and generates clinical summaries for healthcare providers.

## Key Features

### 1. **Structured Clinical Interview**
- 6-phase assessment process:
  - Chief Complaint
  - HPI Development (History of Present Illness)
  - Review of Systems
  - Medical History
  - Risk Stratification
  - Clinical Summary

### 2. **AI-Powered Features**
- Real-time medical context analysis
- Red flag symptom detection
- Risk stratification (standard/moderate/high)
- Differential diagnosis generation
- Clinical recommendations
- Quick reply suggestions
- Medical follow-up questions

### 3. **User Interface Components**
- Progress tracker showing assessment phases
- Chat interface with quick replies and medical suggestions
- Emergency modal with geolocation support
- Clinical summary generation and submission
- Voice input and camera support (placeholders for future implementation)

### 4. **Safety Features**
- Emergency button with multiple contact options
- Red flag symptom detection
- Urgency level indicators
- HIPAA-compliant design considerations

## Architecture

### Components Structure
```
apps/provider-portal/
├── components/patient-chat/
│   ├── PatientChat.tsx          # Main container component
│   ├── ChatMessage.tsx          # Individual message display
│   ├── ChatInput.tsx            # Input with voice/media support
│   ├── ProgressTracker.tsx      # Assessment phase tracker
│   ├── QuickReplies.tsx         # Quick reply buttons
│   ├── MedicalSuggestions.tsx   # Medical follow-up suggestions
│   ├── AIStatusIndicator.tsx    # AI processing status
│   ├── EmergencyModal.tsx       # Emergency help options
│   └── ClinicalSummary.tsx      # Summary generation/submission
├── services/biomistral/
│   └── BioMistralService.ts     # AI service integration
├── store/
│   └── patientChatStore.ts      # Zustand state management
└── types/
    ├── medical.ts               # Medical-specific types
    └── chat.ts                  # Chat interface types
```

### Data Flow
1. Patient inputs symptoms via chat interface
2. BioMistralService processes input with medical context
3. AI generates appropriate follow-up questions
4. Clinical data is extracted and stored
5. Progress advances through assessment phases
6. Clinical summary is generated
7. Summary is submitted to provider portal

## Usage

### Starting a Patient Assessment
```typescript
import { PatientChat } from '@/components/patient-chat/PatientChat';

// In your page component
export default function PatientAssessmentPage() {
  return <PatientChat patientId="patient-123" />;
}
```

### Accessing the Interface
Navigate to `/patient-chat` to access the patient assessment interface.

## BioMistral Service Configuration

### Environment Variables
```env
NEXT_PUBLIC_BIOMISTRAL_API_ENDPOINT=your-api-endpoint
NEXT_PUBLIC_BIOMISTRAL_API_KEY=your-api-key
```

### Mock Mode
The service includes sophisticated mock responses for development/testing when API credentials are not configured.

## State Management

The application uses Zustand for state management with the following key stores:

### patientChatStore
- Manages chat messages and conversation flow
- Handles clinical data collection
- Controls UI state (modals, processing indicators)
- Manages session lifecycle

## Clinical Data Model

### Assessment Phases
```typescript
type AssessmentPhase = 
  | 'chief-complaint'
  | 'hpi-development'
  | 'review-of-systems'
  | 'medical-history'
  | 'risk-stratification'
  | 'clinical-summary';
```

### Urgency Levels
```typescript
type UrgencyLevel = 'standard' | 'moderate' | 'high';
```

### Clinical Data Structure
- Chief complaint
- History of present illness (HPI)
- Review of systems (ROS)
- Past medical history (PMH)
- Medications and allergies
- Risk factors and red flags
- Differential diagnoses

## Provider Portal Integration

The system integrates with the existing provider portal:

1. **AIAssistant Component Enhancement**
   - Detects BioMistral assessments
   - Displays AI-conducted interview indicator
   - Shows clinical insights from patient assessment

2. **Message Types**
   - Added `biomistral-assessment` message type
   - Enhanced AI analysis to include source tracking

## Security Considerations

- Input sanitization for all patient inputs
- Sensitive data detection (SSN, credit cards, etc.)
- Session-based data persistence
- Secure API communication patterns
- HIPAA compliance considerations in UI/UX

## Future Enhancements

1. **Real BioMistral API Integration**
   - Replace mock responses with actual API calls
   - Implement streaming responses
   - Add model fine-tuning capabilities

2. **Enhanced Media Support**
   - Implement camera functionality for symptom photos
   - Add voice-to-text transcription
   - Support document uploads

3. **Advanced Features**
   - ICD-10 code suggestions
   - Drug interaction checking
   - Evidence-based treatment recommendations
   - Multi-language support

4. **Provider Tools**
   - Batch assessment review
   - Clinical decision support
   - Automated documentation generation
   - Team collaboration features

## Testing

### Running the Development Server
```bash
cd apps/provider-portal
npm run dev
```

### Accessing the Patient Chat
1. Navigate to `http://localhost:3000/patient-chat`
2. The interface will automatically start a new session
3. Use quick replies or type custom responses
4. Complete all phases to generate a clinical summary

## Troubleshooting

### Common Issues

1. **TypeScript Errors**
   - Ensure all type definitions are properly imported
   - Check that environment variables are defined

2. **State Management**
   - Clear browser storage if state persists incorrectly
   - Check Zustand devtools for state debugging

3. **UI Responsiveness**
   - The interface is optimized for desktop
   - Mobile responsiveness may need enhancement

## Contributing

When contributing to the BioMistral integration:

1. Follow the existing TypeScript patterns
2. Maintain the 6-phase assessment structure
3. Ensure all medical terminology is accurate
4. Add appropriate error handling
5. Update types when adding new features
6. Test emergency workflows thoroughly

## License

This implementation is part of the ATTENDING medical platform and follows the project's licensing terms.
