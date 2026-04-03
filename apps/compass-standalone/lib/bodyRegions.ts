// ============================================================
// COMPASS — Body Region Definitions for Guided Photo Capture
// Defines anatomical regions, photo guidance per region,
// and region-specific conditions for vision AI context
// ============================================================

// ============================================================
// Types
// ============================================================

export interface PhotoShot {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

export interface BodyRegion {
  id: string;
  label: string;
  icon: string;
  /** Conditions the vision AI should look for in this region */
  focusConditions: string[];
  /** Photo guidance for this region */
  photoGuide: {
    shots: PhotoShot[];
    tips: string[];
  };
}

// ============================================================
// Body Region Definitions
// ============================================================

export const BODY_REGIONS: BodyRegion[] = [
  {
    id: 'head_face',
    label: 'Head / Face',
    icon: '🧑',
    focusConditions: ['skin lesion', 'rash', 'swelling', 'asymmetry', 'discoloration', 'laceration', 'bruising'],
    photoGuide: {
      shots: [
        { id: 'closeup', label: 'Close-up', description: 'Focus on the specific area of concern', required: true },
        { id: 'full', label: 'Full face', description: 'Straight-on photo of your full face for comparison', required: true },
        { id: 'side', label: 'Side view', description: 'Profile view if the concern is on the side', required: false },
      ],
      tips: ['Use good lighting — face a window', 'Remove glasses or hats', 'Pull hair away from the area'],
    },
  },
  {
    id: 'neck_throat',
    label: 'Neck / Throat',
    icon: '🗣️',
    focusConditions: ['erythema', 'exudate', 'swelling', 'lymphadenopathy', 'uvular deviation', 'peritonsillar bulge', 'mass', 'rash'],
    photoGuide: {
      shots: [
        { id: 'throat', label: 'Open mouth', description: 'Open wide, stick out your tongue — use a flashlight for the back of the throat', required: true },
        { id: 'neck_front', label: 'Front of neck', description: 'Photo of the front of your neck showing any swelling', required: true },
        { id: 'neck_side', label: 'Side of neck', description: 'Show any lumps or swelling on the side', required: false },
      ],
      tips: ['Use the flash or a flashlight for throat photos', 'Say "ahhh" to open the throat', 'Tilt head back slightly for better view'],
    },
  },
  {
    id: 'chest',
    label: 'Chest',
    icon: '🫁',
    focusConditions: ['rash', 'skin lesion', 'swelling', 'bruising', 'surgical site', 'device site'],
    photoGuide: {
      shots: [
        { id: 'closeup', label: 'Close-up', description: 'Focus on the specific area of concern', required: true },
        { id: 'wide', label: 'Wide view', description: 'Step back to show the full chest area', required: true },
        { id: 'side', label: 'Side view', description: 'Show the area from a different angle', required: false },
      ],
      tips: ['Good lighting is essential', 'Include a coin or ruler next to skin changes for size reference'],
    },
  },
  {
    id: 'abdomen',
    label: 'Abdomen',
    icon: '🫃',
    focusConditions: ['distension', 'rash', 'surgical scar', 'hernia', 'bruising', 'skin changes', 'wound'],
    photoGuide: {
      shots: [
        { id: 'closeup', label: 'Close-up', description: 'Focus on the specific area', required: true },
        { id: 'full', label: 'Full abdomen', description: 'Standing photo showing full abdominal area', required: true },
        { id: 'side', label: 'Profile view', description: 'Side view to show any distension or protrusion', required: false },
      ],
      tips: ['Stand upright for the full view', 'Point to the area that hurts if possible'],
    },
  },
  {
    id: 'upper_back',
    label: 'Upper Back',
    icon: '🔙',
    focusConditions: ['rash', 'skin lesion', 'swelling', 'curvature', 'bruising', 'mole changes'],
    photoGuide: {
      shots: [
        { id: 'closeup', label: 'Close-up', description: 'Focus on the area of concern', required: true },
        { id: 'wide', label: 'Wide view', description: 'Show the full upper back', required: true },
        { id: 'angle', label: 'Alternate angle', description: 'Another perspective showing the area', required: false },
      ],
      tips: ['You may need help from someone to photograph your back', 'Use a mirror and phone timer if alone'],
    },
  },
  {
    id: 'lower_back',
    label: 'Lower Back',
    icon: '🔙',
    focusConditions: ['rash', 'swelling', 'curvature', 'bruising', 'pilonidal area', 'sacral dimple'],
    photoGuide: {
      shots: [
        { id: 'closeup', label: 'Close-up', description: 'Focus on the area of concern', required: true },
        { id: 'wide', label: 'Wide view', description: 'Show the full lower back area', required: true },
        { id: 'side', label: 'Side view', description: 'Profile view to show posture or swelling', required: false },
      ],
      tips: ['You may need help from someone to photograph your back'],
    },
  },
  {
    id: 'left_arm',
    label: 'Left Arm',
    icon: '💪',
    focusConditions: ['rash', 'swelling', 'bruising', 'deformity', 'wound', 'skin lesion', 'joint swelling'],
    photoGuide: {
      shots: [
        { id: 'closeup', label: 'Close-up', description: 'Focus on the affected area', required: true },
        { id: 'full', label: 'Full arm', description: 'Show the entire arm for context', required: true },
        { id: 'comparison', label: 'Compare to right arm', description: 'Show both arms side by side', required: false },
      ],
      tips: ['Include a comparison to the other arm if there is swelling or asymmetry'],
    },
  },
  {
    id: 'right_arm',
    label: 'Right Arm',
    icon: '💪',
    focusConditions: ['rash', 'swelling', 'bruising', 'deformity', 'wound', 'skin lesion', 'joint swelling'],
    photoGuide: {
      shots: [
        { id: 'closeup', label: 'Close-up', description: 'Focus on the affected area', required: true },
        { id: 'full', label: 'Full arm', description: 'Show the entire arm for context', required: true },
        { id: 'comparison', label: 'Compare to left arm', description: 'Show both arms side by side', required: false },
      ],
      tips: ['Include a comparison to the other arm if there is swelling or asymmetry'],
    },
  },
  {
    id: 'left_hand',
    label: 'Left Hand',
    icon: '✋',
    focusConditions: ['joint deformity', 'swelling', 'skin lesion', 'nail changes', 'wound', 'rash', 'nodule', 'trigger finger', 'contracture'],
    photoGuide: {
      shots: [
        { id: 'closeup', label: 'Close-up', description: 'Focus on the specific joint or area that concerns you', required: true },
        { id: 'palm', label: 'Palm up', description: 'Full view of your palm and fingers spread out', required: true },
        { id: 'dorsum', label: 'Back of hand', description: 'Show the back of your hand with fingers extended', required: false },
      ],
      tips: ['Spread your fingers for joint photos', 'Include fingernails if there are nail changes', 'Place hand on a flat surface with good lighting'],
    },
  },
  {
    id: 'right_hand',
    label: 'Right Hand',
    icon: '✋',
    focusConditions: ['joint deformity', 'swelling', 'skin lesion', 'nail changes', 'wound', 'rash', 'nodule', 'trigger finger', 'contracture'],
    photoGuide: {
      shots: [
        { id: 'closeup', label: 'Close-up', description: 'Focus on the specific joint or area that concerns you', required: true },
        { id: 'palm', label: 'Palm up', description: 'Full view of your palm and fingers spread out', required: true },
        { id: 'dorsum', label: 'Back of hand', description: 'Show the back of your hand with fingers extended', required: false },
      ],
      tips: ['Spread your fingers for joint photos', 'Include fingernails if there are nail changes', 'Place hand on a flat surface with good lighting'],
    },
  },
  {
    id: 'left_leg',
    label: 'Left Leg',
    icon: '🦵',
    focusConditions: ['swelling', 'rash', 'bruising', 'varicose veins', 'wound', 'skin discoloration', 'deformity', 'edema'],
    photoGuide: {
      shots: [
        { id: 'closeup', label: 'Close-up', description: 'Focus on the area of concern', required: true },
        { id: 'full', label: 'Full leg', description: 'Show the entire leg while standing', required: true },
        { id: 'comparison', label: 'Both legs', description: 'Show both legs side by side for comparison', required: false },
      ],
      tips: ['Standing photos show swelling best', 'Compare to the other leg for asymmetry'],
    },
  },
  {
    id: 'right_leg',
    label: 'Right Leg',
    icon: '🦵',
    focusConditions: ['swelling', 'rash', 'bruising', 'varicose veins', 'wound', 'skin discoloration', 'deformity', 'edema'],
    photoGuide: {
      shots: [
        { id: 'closeup', label: 'Close-up', description: 'Focus on the area of concern', required: true },
        { id: 'full', label: 'Full leg', description: 'Show the entire leg while standing', required: true },
        { id: 'comparison', label: 'Both legs', description: 'Show both legs side by side for comparison', required: false },
      ],
      tips: ['Standing photos show swelling best', 'Compare to the other leg for asymmetry'],
    },
  },
  {
    id: 'left_foot',
    label: 'Left Foot',
    icon: '🦶',
    focusConditions: ['wound', 'ulcer', 'deformity', 'swelling', 'skin changes', 'nail changes', 'callus', 'bunion', 'rash', 'diabetic foot changes'],
    photoGuide: {
      shots: [
        { id: 'top', label: 'Top view', description: 'Photo of the top of your foot', required: true },
        { id: 'sole', label: 'Bottom / sole', description: 'Photo of the sole — important for wounds or calluses', required: true },
        { id: 'comparison', label: 'Both feet', description: 'Show both feet side by side for comparison', required: false },
      ],
      tips: ['Clean the foot before photographing wounds', 'Show between toes if that is the area of concern', 'Include a ruler or coin for wound size reference'],
    },
  },
  {
    id: 'right_foot',
    label: 'Right Foot',
    icon: '🦶',
    focusConditions: ['wound', 'ulcer', 'deformity', 'swelling', 'skin changes', 'nail changes', 'callus', 'bunion', 'rash', 'diabetic foot changes'],
    photoGuide: {
      shots: [
        { id: 'top', label: 'Top view', description: 'Photo of the top of your foot', required: true },
        { id: 'sole', label: 'Bottom / sole', description: 'Photo of the sole — important for wounds or calluses', required: true },
        { id: 'comparison', label: 'Both feet', description: 'Show both feet side by side for comparison', required: false },
      ],
      tips: ['Clean the foot before photographing wounds', 'Show between toes if that is the area of concern', 'Include a ruler or coin for wound size reference'],
    },
  },
  {
    id: 'skin_general',
    label: 'Skin / Rash',
    icon: '🔴',
    focusConditions: ['rash distribution', 'lesion morphology', 'color changes', 'texture changes', 'mole', 'scale', 'vesicle', 'papule', 'plaque', 'urticaria', 'petechiae'],
    photoGuide: {
      shots: [
        { id: 'closeup', label: 'Close-up with ruler', description: 'Close-up of the rash/lesion — place a coin or ruler next to it for size', required: true },
        { id: 'distribution', label: 'Wide view', description: 'Step back to show how much area is affected and the distribution pattern', required: true },
        { id: 'additional', label: 'Other areas', description: 'Photo any other areas on your body with similar changes', required: false },
      ],
      tips: ['Use a coin, ruler, or fingertip next to the area for size reference', 'Natural lighting shows skin color most accurately', 'Show distribution pattern — is it symmetric? Localized? Widespread?'],
    },
  },
  {
    id: 'eye',
    label: 'Eye',
    icon: '👁️',
    focusConditions: ['redness', 'discharge', 'swelling', 'ptosis', 'pupil asymmetry', 'stye', 'chalazion', 'subconjunctival hemorrhage', 'foreign body'],
    photoGuide: {
      shots: [
        { id: 'closeup', label: 'Close-up of eye', description: 'Focus on the affected eye with good lighting', required: true },
        { id: 'both', label: 'Both eyes', description: 'Straight-on photo showing both eyes for comparison', required: true },
        { id: 'lid', label: 'Eyelid detail', description: 'Pull down lower lid or lift upper lid if the concern is there', required: false },
      ],
      tips: ['Use natural lighting — avoid flash directly into the eye', 'Look straight at the camera', 'Have someone else take the photo if possible'],
    },
  },
  {
    id: 'other',
    label: 'Other Area',
    icon: '📷',
    focusConditions: ['general assessment', 'wound', 'swelling', 'discoloration', 'deformity'],
    photoGuide: {
      shots: [
        { id: 'closeup', label: 'Close-up', description: 'Get as close as you can while staying in focus', required: true },
        { id: 'wide', label: 'Wide view', description: 'Step back to show the full area in context', required: true },
        { id: 'alternate', label: 'Alternate angle', description: 'Show the area from another direction', required: false },
      ],
      tips: ['Use good lighting', 'Include a size reference if relevant', 'Describe the location when you send the photo'],
    },
  },
];

// ============================================================
// Lookup
// ============================================================

export function getBodyRegion(id: string): BodyRegion | undefined {
  return BODY_REGIONS.find(r => r.id === id);
}

/**
 * Build a region-specific vision prompt enhancement
 */
export function buildRegionPromptContext(regionId: string, shotLabel: string): string {
  const region = getBodyRegion(regionId);
  if (!region) return '';

  const conditions = region.focusConditions.join(', ');
  return `This is a ${shotLabel.toLowerCase()} photograph of the patient's ${region.label.toLowerCase()}. Focus analysis on: ${conditions}. Assess for any clinically significant findings relevant to this anatomical region.`;
}
