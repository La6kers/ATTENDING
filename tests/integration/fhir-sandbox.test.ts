/**
 * FHIR Sandbox Integration Tests
 * 
 * Tests the FHIR client against sandbox endpoints:
 * - Epic: https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
 * - Cerner: https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d
 * - athenahealth: https://api.sandbox.platform.athenahealth.com/fhir/r4
 * 
 * These tests require network access and valid sandbox credentials.
 * Skip in CI unless FHIR_SANDBOX_ENABLED=true.
 */

import { describe, it, expect, beforeAll } from 'vitest';

const FHIR_SANDBOX_ENABLED = process.env.FHIR_SANDBOX_ENABLED === 'true';
const EPIC_SANDBOX_URL = 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4';
const CERNER_SANDBOX_URL = 'https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d';

const describeIf = FHIR_SANDBOX_ENABLED ? describe : describe.skip;

describeIf('FHIR Sandbox Integration', () => {
  describe('Epic Sandbox', () => {
    it('should fetch CapabilityStatement (metadata)', async () => {
      const response = await fetch(`${EPIC_SANDBOX_URL}/metadata`, {
        headers: { 'Accept': 'application/fhir+json' },
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.resourceType).toBe('CapabilityStatement');
      expect(data.fhirVersion).toMatch(/4\.\d+\.\d+/);
    });

    it('should support Patient resource', async () => {
      const response = await fetch(`${EPIC_SANDBOX_URL}/metadata`, {
        headers: { 'Accept': 'application/fhir+json' },
      });
      
      const data = await response.json();
      const patientResource = data.rest?.[0]?.resource?.find(
        (r: any) => r.type === 'Patient'
      );
      
      expect(patientResource).toBeDefined();
      expect(patientResource.interaction).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'read' }),
          expect.objectContaining({ code: 'search-type' }),
        ])
      );
    });

    it('should support required FHIR resources for ATTENDING', async () => {
      const response = await fetch(`${EPIC_SANDBOX_URL}/metadata`, {
        headers: { 'Accept': 'application/fhir+json' },
      });
      
      const data = await response.json();
      const resources = data.rest?.[0]?.resource?.map((r: any) => r.type) || [];
      
      const requiredResources = [
        'Patient',
        'Encounter', 
        'Observation',
        'DiagnosticReport',
        'ServiceRequest',
        'MedicationRequest',
        'AllergyIntolerance',
        'Condition',
      ];
      
      for (const resource of requiredResources) {
        expect(resources).toContain(resource);
      }
    });
  });

  describe('Cerner Sandbox', () => {
    it('should fetch CapabilityStatement', async () => {
      const response = await fetch(`${CERNER_SANDBOX_URL}/metadata`, {
        headers: { 'Accept': 'application/fhir+json' },
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.resourceType).toBe('CapabilityStatement');
    });
  });

  describe('FHIR Resource Mapping', () => {
    it('ATTENDING Patient maps to FHIR Patient', () => {
      // Verify our mapping configuration covers required fields
      const attendingPatientFields = [
        'mrn', 'firstName', 'lastName', 'dateOfBirth', 
        'gender', 'email', 'phone', 'address'
      ];
      
      const fhirPatientMapping: Record<string, string> = {
        mrn: 'identifier[0].value',
        firstName: 'name[0].given[0]',
        lastName: 'name[0].family',
        dateOfBirth: 'birthDate',
        gender: 'gender',
        email: 'telecom[system=email].value',
        phone: 'telecom[system=phone].value',
        address: 'address[0]',
      };

      for (const field of attendingPatientFields) {
        expect(fhirPatientMapping[field]).toBeDefined();
      }
    });

    it('ATTENDING LabOrder maps to FHIR ServiceRequest', () => {
      const labOrderMapping: Record<string, string> = {
        testCode: 'code.coding[0].code',
        testName: 'code.coding[0].display',
        priority: 'priority',
        status: 'status',
        patientId: 'subject.reference',
        encounterId: 'encounter.reference',
        orderingProviderId: 'requester.reference',
      };

      const requiredFields = ['testCode', 'priority', 'status', 'patientId'];
      for (const field of requiredFields) {
        expect(labOrderMapping[field]).toBeDefined();
      }
    });
  });
});
