import { describe, it, expect } from 'vitest';
import { authApi, documentApi, summaryApi, adminApi } from '../lib/api';

describe('Frontend API Client Contracts', () => {
  it('defines auth endpoints including LinkedIn and session checks', () => {
    expect(authApi.login).toBeInstanceOf(Function);
    expect(authApi.signup).toBeInstanceOf(Function);
    expect(authApi.me).toBeInstanceOf(Function);
    expect(authApi.linkedinAuth).toBeInstanceOf(Function);
    expect(authApi.googleAuth).toBeInstanceOf(Function);
    expect(authApi.githubAuth).toBeInstanceOf(Function);
  });

  it('defines document endpoints including batch upload and grounded ask', () => {
    expect(documentApi.upload).toBeInstanceOf(Function);
    expect(documentApi.batchUpload).toBeInstanceOf(Function);
    expect(documentApi.importUrl).toBeInstanceOf(Function);
    expect(documentApi.ask).toBeInstanceOf(Function);
    expect(documentApi.queryCorpus).toBeInstanceOf(Function);
    expect(documentApi.downloadUrl).toBeInstanceOf(Function);
  });

  it('defines summary endpoints including compare and export', () => {
    expect(summaryApi.generate).toBeInstanceOf(Function);
    expect(summaryApi.compare).toBeInstanceOf(Function);
    expect(summaryApi.getVersions).toBeInstanceOf(Function);
    expect(summaryApi.export).toBeInstanceOf(Function);
  });

  it('defines admin endpoints for governance and telemetry', () => {
    expect(adminApi.getOverview).toBeInstanceOf(Function);
    expect(adminApi.getDatasets).toBeInstanceOf(Function);
    expect(adminApi.addDatasetItem).toBeInstanceOf(Function);
    expect(adminApi.getSystemHealth).toBeInstanceOf(Function);
    expect(adminApi.getUsers).toBeInstanceOf(Function);
    expect(adminApi.updateUserRole).toBeInstanceOf(Function);
  });
});

