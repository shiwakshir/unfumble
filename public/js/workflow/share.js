/**
 * Unfumble Deep Linking & Shareable Custom Tool Engine
 * Encodes custom workflows into compressed URL hashes for instant 1-click sharing without a database.
 */

import { WORKFLOW_TEMPLATES } from './templates.js';
import { SMARTFIX_PRESETS } from '../smartfix/smartfix.js';
import { getOperation } from '../operations/registry.js';

/**
 * Encodes a workflow specification into a URL-safe base64 string.
 */
export function encodeWorkflowToHash(workflow) {
  const minimal = {
    t: workflow.title,
    d: workflow.description,
    i: workflow.inputTypes,
    m: workflow.multiple ? 1 : 0,
    ops: workflow.operations.map(op => ({
      id: op.operationId,
      n: op.name,
      p: op.params
    })),
    cfg: workflow.configurableFields || {}
  };

  const jsonStr = JSON.stringify(minimal);
  // URL-safe base64 encoding
  const b64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
  return encodeURIComponent(b64);
}

/**
 * Decodes a workflow specification from a URL-safe base64 string.
 * Strictly validates operations against registry and defends against prototype pollution / injection.
 */
export function decodeWorkflowFromHash(encodedHash) {
  try {
    if (typeof encodedHash !== 'string' || encodedHash.length > 50000) return null;
    const b64 = decodeURIComponent(encodedHash);
    const jsonStr = decodeURIComponent(Array.from(atob(b64)).map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    // Safe reviver prevents prototype pollution
    const parsed = JSON.parse(jsonStr, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }
      return value;
    });

    if (!parsed || typeof parsed !== 'object') return null;

    // Filter operations to strictly registered, verified modules
    const validatedOps = (parsed.ops || [])
      .filter(op => op && typeof op.id === 'string' && getOperation(op.id))
      .map((op, idx) => ({
        stepId: `step_${idx + 1}`,
        operationId: op.id,
        name: String(op.n || op.id).slice(0, 80),
        params: (op.p && typeof op.p === 'object') ? op.p : {}
      }));

    if (validatedOps.length === 0) {
      console.warn('Decoded workflow rejected: contained zero valid registered operations.');
      return null;
    }

    return {
      id: `shared_${Date.now()}`,
      title: String(parsed.t || 'Shared Custom Tool').slice(0, 100),
      description: String(parsed.d || 'Shared via Unfumble link').slice(0, 500),
      inputTypes: Array.isArray(parsed.i) ? parsed.i.slice(0, 10) : ['*/*'],
      multiple: parsed.m === 1,
      operations: validatedOps,
      configurableFields: (parsed.cfg && typeof parsed.cfg === 'object') ? parsed.cfg : {},
      isShared: true,
      updatedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error('Failed to decode workflow from URL hash:', err);
    return null;
  }
}

/**
 * Generates the full shareable URL for a workflow.
 */
export function getShareableUrl(workflow) {
  const hash = encodeWorkflowToHash(workflow);
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#tool=${hash}`;
}

/**
 * Inspects current window.location.hash and returns navigation directives.
 */
export function parseCurrentLocationHash() {
  const hash = window.location.hash;
  if (!hash || hash.length <= 1) return null;

  const content = hash.substring(1); // remove '#'
  const params = new URLSearchParams(content);

  // 1. Custom tool encoded in hash: #tool=...
  if (params.has('tool')) {
    const decoded = decodeWorkflowFromHash(params.get('tool'));
    if (decoded) {
      return { type: 'custom_tool', workflow: decoded };
    }
  }

  // 2. Pre-built template: #template=template_resize_rename_images
  if (params.has('template')) {
    const tId = params.get('template');
    const tpl = WORKFLOW_TEMPLATES.find(t => t.id === tId);
    if (tpl) {
      return { type: 'template', workflow: tpl };
    }
  }

  // 3. Smart Fix preset: #smartfix=passport_visa
  if (params.has('smartfix')) {
    const presetId = params.get('smartfix');
    if (SMARTFIX_PRESETS[presetId]) {
      return { type: 'smartfix', presetId };
    }
  }

  // 4. Tab navigation: #tab=pdf-tools
  if (params.has('tab')) {
    return { type: 'tab', tabId: `tab-${params.get('tab')}` };
  }

  return null;
}
