// =============================================================================
// ATTENDING AI - CMS Record Locator Service Client
// packages/fhir-client/src/network/RecordLocator.ts
//
// Queries CMS-Aligned Networks to find patient records across the ecosystem
// =============================================================================

import type { RecordLocatorQuery, RecordLocatorResult, CmsNetworkConfig } from '../types';

// =============================================================================
// Record Locator Service
// =============================================================================

export class RecordLocatorService {
  private networks: Map<string, CmsNetworkConfig> = new Map();

  /**
   * Register a CMS-Aligned Network for record discovery.
   */
  registerNetwork(config: CmsNetworkConfig): void {
    this.networks.set(config.networkId, config);
  }

  /**
   * Remove a registered network.
   */
  unregisterNetwork(networkId: string): void {
    this.networks.delete(networkId);
  }

  /**
   * Get all registered networks.
   */
  getRegisteredNetworks(): CmsNetworkConfig[] {
    return Array.from(this.networks.values());
  }

  /**
   * Locate patient records across CMS-Aligned Networks.
   *
   * The Record Locator Service (RLS) queries each network to find where
   * a patient's records exist. Only networks the patient has consented
   * to query are included.
   */
  async locateRecords(query: RecordLocatorQuery): Promise<RecordLocatorResult[]> {
    // Filter to consented networks only
    const targetNetworks = query.networkIds
      ? Array.from(this.networks.values()).filter(n => query.networkIds!.includes(n.networkId))
      : Array.from(this.networks.values());

    if (targetNetworks.length === 0) {
      return [];
    }

    // Query each network in parallel
    const queries = targetNetworks.map(async (network): Promise<RecordLocatorResult | null> => {
      try {
        return await this.queryNetwork(network, query);
      } catch (error) {
        console.error(`Record locator query failed for network ${network.networkId}:`, error);
        return null;
      }
    });

    const results = await Promise.all(queries);
    return results.filter((r): r is RecordLocatorResult => r !== null);
  }

  /**
   * Query a single CMS-Aligned Network for patient records.
   */
  private async queryNetwork(
    network: CmsNetworkConfig,
    query: RecordLocatorQuery,
  ): Promise<RecordLocatorResult | null> {
    // If the network has a dedicated Record Locator URL, use that
    if (network.recordLocatorUrl) {
      return this.queryDedicatedRLS(network, query);
    }

    // Otherwise, query the FHIR endpoint directly with $match or search
    return this.queryFhirEndpoint(network, query);
  }

  /**
   * Query a dedicated Record Locator Service endpoint.
   */
  private async queryDedicatedRLS(
    network: CmsNetworkConfig,
    query: RecordLocatorQuery,
  ): Promise<RecordLocatorResult | null> {
    const response = await fetch(network.recordLocatorUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        patientIdentifier: query.patientIdentifier,
        dataCategories: query.dataCategories,
      }),
    });

    if (!response.ok) {
      if (response.status === 404) return null; // Patient not found at this network
      throw new Error(`RLS query failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      networkId: network.networkId,
      networkName: network.networkName,
      fhirEndpoint: network.fhirBaseUrl,
      patientReference: data.patientReference || `Patient/${data.patientId}`,
      availableResources: data.availableResources || network.supportedResources,
      lastUpdated: data.lastUpdated,
    };
  }

  /**
   * Query a FHIR endpoint directly to find patient records.
   * Uses Patient $match operation or standard search.
   */
  private async queryFhirEndpoint(
    network: CmsNetworkConfig,
    query: RecordLocatorQuery,
  ): Promise<RecordLocatorResult | null> {
    // Try Patient $match first (FHIR R4 operation for patient matching)
    try {
      const matchResponse = await fetch(`${network.fhirBaseUrl}/Patient/$match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json',
          Accept: 'application/fhir+json',
        },
        body: JSON.stringify({
          resourceType: 'Parameters',
          parameter: [{
            name: 'resource',
            resource: {
              resourceType: 'Patient',
              identifier: [{
                value: query.patientIdentifier,
              }],
            },
          }],
        }),
      });

      if (matchResponse.ok) {
        const bundle = await matchResponse.json();
        if (bundle.entry?.length > 0) {
          const patient = bundle.entry[0].resource;
          return {
            networkId: network.networkId,
            networkName: network.networkName,
            fhirEndpoint: network.fhirBaseUrl,
            patientReference: `Patient/${patient.id}`,
            availableResources: network.supportedResources,
            lastUpdated: patient.meta?.lastUpdated,
          };
        }
      }
    } catch {
      // $match not supported, fall back to standard search
    }

    // Fall back to standard Patient search
    const searchParams = new URLSearchParams({
      identifier: query.patientIdentifier,
    });

    const response = await fetch(
      `${network.fhirBaseUrl}/Patient?${searchParams.toString()}`,
      {
        headers: { Accept: 'application/fhir+json' },
      },
    );

    if (!response.ok || response.status === 404) return null;

    const bundle = await response.json();
    if (!bundle.entry?.length) return null;

    const patient = bundle.entry[0].resource;
    return {
      networkId: network.networkId,
      networkName: network.networkName,
      fhirEndpoint: network.fhirBaseUrl,
      patientReference: `Patient/${patient.id}`,
      availableResources: network.supportedResources,
      lastUpdated: patient.meta?.lastUpdated,
    };
  }
}
