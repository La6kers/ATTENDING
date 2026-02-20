// ============================================================
// ATTENDING AI - HL7v2 Message Adapter
// apps/shared/lib/integrations/hl7v2.ts
//
// Parse and generate HL7 v2.x messages for hospital integration.
// Supports the most common message types:
//
//   ADT^A01  - Patient admission
//   ADT^A04  - Patient registration
//   ADT^A08  - Patient update
//   ADT^A28  - Add person
//   ORM^O01  - General order
//   ORU^R01  - Observation result (lab/vital)
//   SIU^S12  - Scheduling
//   MDM^T02  - Document notification
//
// Message structure:
//   MSH|...|     ← Message header
//   PID|...|     ← Patient identification
//   PV1|...|     ← Patient visit
//   OBR|...|     ← Observation request
//   OBX|...|     ← Observation result
//
// Usage:
//   import { HL7v2Parser, HL7v2Builder } from '@attending/shared/lib/integrations/hl7v2';
//
//   // Parse incoming message
//   const msg = HL7v2Parser.parse(rawHL7String);
//   const patient = msg.getPatient();
//
//   // Build outbound message
//   const oru = new HL7v2Builder('ORU', 'R01')
//     .setPatient(patient)
//     .addObservation({ code: '2160-0', value: '1.2', unit: 'mg/dL' })
//     .build();
// ============================================================

// ============================================================
// TYPES
// ============================================================

export interface HL7Segment {
  name: string;
  fields: string[];
}

export interface HL7Message {
  segments: HL7Segment[];
  raw: string;

  /** Get first segment of a given type */
  getSegment(name: string): HL7Segment | undefined;

  /** Get all segments of a given type */
  getSegments(name: string): HL7Segment[];

  /** Extract patient data from PID segment */
  getPatient(): HL7Patient | null;

  /** Extract observation results from OBX segments */
  getObservations(): HL7Observation[];

  /** Get message type (e.g., 'ADT^A01') */
  getMessageType(): string;

  /** Get sending facility */
  getSendingFacility(): string;

  /** Get message control ID */
  getControlId(): string;
}

export interface HL7Patient {
  id: string;           // PID.3 - Patient identifier
  mrn?: string;         // MRN from identifier list
  firstName: string;    // PID.5.2
  lastName: string;     // PID.5.1
  middleName?: string;  // PID.5.3
  dateOfBirth?: string; // PID.7 (YYYYMMDD)
  gender?: string;      // PID.8
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  phone?: string;       // PID.13
  ssn?: string;         // PID.19
  accountNumber?: string; // PID.18
}

export interface HL7Observation {
  setId: string;        // OBX.1
  valueType: string;    // OBX.2 (NM, ST, CE, etc.)
  code: string;         // OBX.3.1 (LOINC or local code)
  codeName?: string;    // OBX.3.2
  codeSystem?: string;  // OBX.3.3
  value: string;        // OBX.5
  unit?: string;        // OBX.6
  referenceRange?: string; // OBX.7
  abnormalFlag?: string;   // OBX.8 (N, H, L, HH, LL, A)
  status: string;       // OBX.11 (F=Final, P=Preliminary, C=Corrected)
  dateTime?: string;    // OBX.14
}

// ============================================================
// PARSER
// ============================================================

const SEGMENT_SEPARATOR = '\r';
const FIELD_SEPARATOR = '|';
const COMPONENT_SEPARATOR = '^';
const REPETITION_SEPARATOR = '~';

export class HL7v2Parser {
  /**
   * Parse a raw HL7v2 message string into a structured object.
   */
  static parse(raw: string): HL7Message {
    // Normalize line endings
    const normalized = raw.replace(/\r\n/g, '\r').replace(/\n/g, '\r').trim();
    const lines = normalized.split(SEGMENT_SEPARATOR).filter(l => l.length > 0);

    const segments: HL7Segment[] = lines.map(line => {
      const name = line.substring(0, 3);

      // MSH is special — the field separator IS field 1
      if (name === 'MSH') {
        const fields = ['MSH', line.charAt(3), ...line.substring(4).split(FIELD_SEPARATOR)];
        return { name, fields };
      }

      const fields = line.split(FIELD_SEPARATOR);
      return { name, fields };
    });

    return new ParsedHL7Message(segments, normalized);
  }

  /**
   * Validate that a string looks like an HL7v2 message.
   */
  static isValid(raw: string): boolean {
    const trimmed = raw.trim();
    return trimmed.startsWith('MSH|') && trimmed.includes('|');
  }

  /**
   * Generate an ACK response for a received message.
   */
  static createACK(
    originalMessage: HL7Message,
    ackCode: 'AA' | 'AE' | 'AR' = 'AA',
    errorMessage?: string
  ): string {
    const now = formatHL7DateTime(new Date());
    const controlId = originalMessage.getControlId();
    const sendingFacility = originalMessage.getSendingFacility();

    const lines = [
      `MSH|^~\\&|ATTENDING_AI|ATTENDING|${sendingFacility}||${now}||ACK|${randomControlId()}|P|2.5.1`,
      `MSA|${ackCode}|${controlId}${errorMessage ? `|${errorMessage}` : ''}`,
    ];

    return lines.join(SEGMENT_SEPARATOR);
  }
}

class ParsedHL7Message implements HL7Message {
  segments: HL7Segment[];
  raw: string;

  constructor(segments: HL7Segment[], raw: string) {
    this.segments = segments;
    this.raw = raw;
  }

  getSegment(name: string): HL7Segment | undefined {
    return this.segments.find(s => s.name === name);
  }

  getSegments(name: string): HL7Segment[] {
    return this.segments.filter(s => s.name === name);
  }

  getMessageType(): string {
    const msh = this.getSegment('MSH');
    if (!msh) return 'UNKNOWN';
    // MSH.9 = message type (field index varies due to MSH special parsing)
    const msgType = msh.fields[9] || msh.fields[8] || '';
    return msgType.replace(COMPONENT_SEPARATOR, '^');
  }

  getSendingFacility(): string {
    const msh = this.getSegment('MSH');
    return msh?.fields[3] || msh?.fields[2] || '';
  }

  getControlId(): string {
    const msh = this.getSegment('MSH');
    return msh?.fields[10] || msh?.fields[9] || '';
  }

  getPatient(): HL7Patient | null {
    const pid = this.getSegment('PID');
    if (!pid) return null;

    const f = pid.fields;
    const nameComponents = (f[5] || '').split(COMPONENT_SEPARATOR);
    const addressComponents = (f[11] || '').split(COMPONENT_SEPARATOR);
    const identifiers = (f[3] || '').split(REPETITION_SEPARATOR);

    // Extract MRN from identifier list
    let mrn: string | undefined;
    let patientId = '';
    for (const id of identifiers) {
      const parts = id.split(COMPONENT_SEPARATOR);
      patientId = patientId || parts[0] || '';
      if (parts[4] === 'MR' || parts[4] === 'MRN') {
        mrn = parts[0];
      }
    }

    return {
      id: patientId,
      mrn: mrn || patientId,
      lastName: nameComponents[0] || '',
      firstName: nameComponents[1] || '',
      middleName: nameComponents[2] || undefined,
      dateOfBirth: f[7] || undefined,
      gender: f[8] || undefined,
      address: addressComponents[0] ? {
        street: addressComponents[0],
        city: addressComponents[2],
        state: addressComponents[3],
        zip: addressComponents[4],
        country: addressComponents[5],
      } : undefined,
      phone: (f[13] || '').split(COMPONENT_SEPARATOR)[0] || undefined,
      ssn: f[19] || undefined,
      accountNumber: f[18] || undefined,
    };
  }

  getObservations(): HL7Observation[] {
    return this.getSegments('OBX').map(obx => {
      const f = obx.fields;
      const codeComponents = (f[3] || '').split(COMPONENT_SEPARATOR);

      return {
        setId: f[1] || '',
        valueType: f[2] || 'ST',
        code: codeComponents[0] || '',
        codeName: codeComponents[1] || undefined,
        codeSystem: codeComponents[2] || undefined,
        value: f[5] || '',
        unit: (f[6] || '').split(COMPONENT_SEPARATOR)[0] || undefined,
        referenceRange: f[7] || undefined,
        abnormalFlag: f[8] || undefined,
        status: f[11] || 'F',
        dateTime: f[14] || undefined,
      };
    });
  }
}

// ============================================================
// BUILDER
// ============================================================

export class HL7v2Builder {
  private segments: string[] = [];
  private messageType: string;
  private triggerEvent: string;

  constructor(messageType: string, triggerEvent: string) {
    this.messageType = messageType;
    this.triggerEvent = triggerEvent;

    // Add MSH header
    const now = formatHL7DateTime(new Date());
    this.segments.push(
      `MSH|^~\\&|ATTENDING_AI|ATTENDING|||${now}||${messageType}^${triggerEvent}|${randomControlId()}|P|2.5.1`
    );
  }

  /** Add PID segment from patient data */
  setPatient(patient: HL7Patient): HL7v2Builder {
    const name = [patient.lastName, patient.firstName, patient.middleName || '']
      .join(COMPONENT_SEPARATOR);
    const address = patient.address
      ? [
          patient.address.street || '',
          '',
          patient.address.city || '',
          patient.address.state || '',
          patient.address.zip || '',
          patient.address.country || '',
        ].join(COMPONENT_SEPARATOR)
      : '';

    // PID: SetID | ExtID | PatientIdList | AltID | PatientName | MotherMaiden | DOB | Sex | ...
    this.segments.push(
      `PID|1||${patient.mrn || patient.id}^^^ATTENDING^MR||${name}||${patient.dateOfBirth || ''}|${patient.gender || ''}|||${address}||${patient.phone || ''}||||${patient.accountNumber || ''}|${patient.ssn || ''}`
    );

    return this;
  }

  /** Add PV1 (patient visit) segment */
  setVisit(options: {
    patientClass?: string; // I=Inpatient, O=Outpatient, E=Emergency
    attendingDoctor?: { id: string; lastName: string; firstName: string };
    location?: string;
    admitDate?: Date;
  }): HL7v2Builder {
    const doc = options.attendingDoctor
      ? `${options.attendingDoctor.id}^${options.attendingDoctor.lastName}^${options.attendingDoctor.firstName}`
      : '';
    const admitDate = options.admitDate ? formatHL7DateTime(options.admitDate) : '';

    this.segments.push(
      `PV1|1|${options.patientClass || 'O'}|${options.location || ''}|||${doc}|||||||||||||||||||||||||||||||||||${admitDate}`
    );
    return this;
  }

  /** Add OBR (observation request) segment */
  addObservationRequest(options: {
    setId?: string;
    orderId: string;
    testCode: string;
    testName: string;
    orderDateTime?: Date;
    priority?: string; // S=STAT, R=Routine, A=ASAP
  }): HL7v2Builder {
    const dt = options.orderDateTime ? formatHL7DateTime(options.orderDateTime) : '';
    this.segments.push(
      `OBR|${options.setId || '1'}|${options.orderId}||${options.testCode}^${options.testName}|||${dt}||||||||||||||||F|||${options.priority || 'R'}`
    );
    return this;
  }

  /** Add OBX (observation result) segment */
  addObservation(obs: {
    setId?: string;
    valueType?: string;
    code: string;
    codeName?: string;
    codeSystem?: string;
    value: string;
    unit?: string;
    referenceRange?: string;
    abnormalFlag?: string;
    status?: string;
    dateTime?: Date;
  }): HL7v2Builder {
    const code = [obs.code, obs.codeName || '', obs.codeSystem || 'LN']
      .join(COMPONENT_SEPARATOR);
    const dt = obs.dateTime ? formatHL7DateTime(obs.dateTime) : '';

    this.segments.push(
      `OBX|${obs.setId || String(this.getSegmentCount('OBX') + 1)}|${obs.valueType || 'NM'}|${code}||${obs.value}|${obs.unit || ''}|${obs.referenceRange || ''}|${obs.abnormalFlag || ''}|||${obs.status || 'F'}|||${dt}`
    );
    return this;
  }

  /** Build the final HL7 message string */
  build(): string {
    return this.segments.join(SEGMENT_SEPARATOR) + SEGMENT_SEPARATOR;
  }

  private getSegmentCount(name: string): number {
    return this.segments.filter(s => s.startsWith(name + '|')).length;
  }
}

// ============================================================
// ATTENDING ↔ HL7v2 MAPPERS
// ============================================================

/**
 * Convert an ATTENDING patient record to HL7v2 PID data.
 */
export function attendingPatientToHL7(patient: {
  id: string;
  mrn?: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | Date;
  gender?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}): HL7Patient {
  let dob: string | undefined;
  if (patient.dateOfBirth) {
    const d = new Date(patient.dateOfBirth);
    dob = d.toISOString().slice(0, 10).replace(/-/g, '');
  }

  return {
    id: patient.id,
    mrn: patient.mrn || patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: dob,
    gender: mapGenderToHL7(patient.gender),
    phone: patient.phone,
    address: {
      street: patient.address,
      city: patient.city,
      state: patient.state,
      zip: patient.zipCode,
    },
  };
}

/**
 * Convert HL7v2 patient data to ATTENDING format.
 */
export function hl7PatientToAttending(hl7Patient: HL7Patient): Record<string, unknown> {
  let dateOfBirth: string | undefined;
  if (hl7Patient.dateOfBirth && hl7Patient.dateOfBirth.length >= 8) {
    const y = hl7Patient.dateOfBirth.substring(0, 4);
    const m = hl7Patient.dateOfBirth.substring(4, 6);
    const d = hl7Patient.dateOfBirth.substring(6, 8);
    dateOfBirth = `${y}-${m}-${d}`;
  }

  return {
    mrn: hl7Patient.mrn || hl7Patient.id,
    firstName: hl7Patient.firstName,
    lastName: hl7Patient.lastName,
    dateOfBirth,
    gender: mapGenderFromHL7(hl7Patient.gender),
    phone: hl7Patient.phone,
    address: hl7Patient.address?.street,
    city: hl7Patient.address?.city,
    state: hl7Patient.address?.state,
    zipCode: hl7Patient.address?.zip,
  };
}

/**
 * Convert HL7v2 observations to ATTENDING lab result format.
 */
export function hl7ObservationsToLabResults(
  observations: HL7Observation[],
  patientId: string
): Record<string, unknown>[] {
  return observations.map(obs => ({
    patientId,
    testCode: obs.code,
    testName: obs.codeName || obs.code,
    loincCode: obs.codeSystem === 'LN' ? obs.code : undefined,
    value: obs.value,
    unit: obs.unit,
    referenceRange: obs.referenceRange,
    interpretation: mapAbnormalFlagToInterpretation(obs.abnormalFlag),
    status: obs.status === 'F' ? 'FINAL' : obs.status === 'P' ? 'PRELIMINARY' : 'FINAL',
    reportedAt: obs.dateTime ? parseHL7DateTime(obs.dateTime) : new Date(),
  }));
}

// ============================================================
// UTILITIES
// ============================================================

function formatHL7DateTime(date: Date): string {
  return date.toISOString().replace(/[-:T]/g, '').substring(0, 14);
}

function parseHL7DateTime(hl7Date: string): Date {
  if (hl7Date.length < 8) return new Date();
  const y = hl7Date.substring(0, 4);
  const m = hl7Date.substring(4, 6);
  const d = hl7Date.substring(6, 8);
  const h = hl7Date.substring(8, 10) || '00';
  const min = hl7Date.substring(10, 12) || '00';
  const s = hl7Date.substring(12, 14) || '00';
  return new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`);
}

function randomControlId(): string {
  return `ATND${Date.now().toString(36).toUpperCase()}`;
}

function mapGenderToHL7(gender?: string): string {
  if (!gender) return 'U';
  const g = gender.toUpperCase();
  if (g === 'MALE' || g === 'M') return 'M';
  if (g === 'FEMALE' || g === 'F') return 'F';
  if (g === 'OTHER' || g === 'O') return 'O';
  return 'U';
}

function mapGenderFromHL7(hl7Gender?: string): string {
  if (!hl7Gender) return 'unknown';
  switch (hl7Gender.toUpperCase()) {
    case 'M': return 'male';
    case 'F': return 'female';
    case 'O': return 'other';
    default: return 'unknown';
  }
}

function mapAbnormalFlagToInterpretation(flag?: string): string | undefined {
  if (!flag) return 'NORMAL';
  switch (flag.toUpperCase()) {
    case 'N': return 'NORMAL';
    case 'H': return 'HIGH';
    case 'L': return 'LOW';
    case 'HH': case 'CH': return 'CRITICAL_HIGH';
    case 'LL': case 'CL': return 'CRITICAL_LOW';
    case 'A': return 'ABNORMAL';
    default: return undefined;
  }
}

export default { HL7v2Parser, HL7v2Builder };
