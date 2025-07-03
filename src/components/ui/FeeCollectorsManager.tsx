import React, { useState } from 'react';
import type { RewardRecipient, FeeDistributionValidation } from '../../../lib/types';
import { InfoTooltip } from './InfoTooltip';

interface FeeCollectorsManagerProps {
  recipients: RewardRecipient[];
  onRecipientsChange: (recipients: RewardRecipient[]) => void;
  useSimpleDistribution: boolean;
  onUseSimpleDistributionChange: (useSimple: boolean) => void;
  validation: FeeDistributionValidation;
}

// Updated fee collector templates to reflect Clanker v4's actual fee structure
// IMPORTANT: Clanker automatically takes 20% at protocol level during swaps
// These templates show distribution of LP fees only (must sum to 100%)
const FEE_COLLECTOR_TEMPLATES = [
  {
    id: 'simple',
    name: 'Simple (2-way split)',
    description: 'You 75%, Platform 25% (of LP fees)',
    note: 'Clanker automatically gets 20% at protocol level',
    recipients: [
      { bps: 7500, label: 'You', isDefault: true }, // 75% of LP fees
      { bps: 2500, label: 'Platform', isDefault: true } // 25% of LP fees
    ]
  },
  {
    id: 'team-split',
    name: 'Team Split (4-way)',
    description: 'You 50%, Team 25%, Platform 20%, Marketing 5% (of LP fees)',
    note: 'Clanker automatically gets 20% at protocol level',
    recipients: [
      { bps: 5000, label: 'You', isDefault: true }, // 50% of LP fees
      { bps: 2500, label: 'Team' }, // 25% of LP fees
      { bps: 2000, label: 'Platform', isDefault: true }, // 20% of LP fees
      { bps: 500, label: 'Marketing' } // 5% of LP fees
    ]
  },
  {
    id: 'dao-structure',
    name: 'DAO Structure (7-way)',
    description: 'Distributed governance model (of LP fees)',
    note: 'Clanker automatically gets 20% at protocol level',
    recipients: [
      { bps: 3000, label: 'Treasury' }, // 30% of LP fees
      { bps: 2000, label: 'Development' }, // 20% of LP fees
      { bps: 2000, label: 'Platform', isDefault: true }, // 20% of LP fees
      { bps: 1500, label: 'Marketing' }, // 15% of LP fees
      { bps: 1000, label: 'Operations' }, // 10% of LP fees
      { bps: 300, label: 'Community' }, // 3% of LP fees
      { bps: 200, label: 'Ecosystem' } // 2% of LP fees
    ]
  }
];

const ASTROPAD_FEE_ADDRESS = '0x2eC50faa88b1CEeeB77bb36e7e31eb7C1FAeB348';

function FeeCollectorsManager({
  recipients,
  onRecipientsChange,
  useSimpleDistribution,
  onUseSimpleDistributionChange,
  validation
}: FeeCollectorsManagerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const applyTemplate = (templateId: string) => {
    const template = FEE_COLLECTOR_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    const newRecipients: RewardRecipient[] = template.recipients.map((r) => ({
      recipient: r.isDefault ? (r.label === 'Platform' ? ASTROPAD_FEE_ADDRESS : '') : '',
      admin: r.isDefault ? (r.label === 'Platform' ? ASTROPAD_FEE_ADDRESS : '') : '',
      bps: r.bps,
      label: r.label,
      isDefault: r.isDefault
    }));

    onRecipientsChange(newRecipients);
    setSelectedTemplate(templateId);
  };

  const handleAddRecipient = () => {
    if (recipients.length >= 7) return;
    
    const newRecipient: RewardRecipient = {
      recipient: '',
      admin: '',
      bps: 0,
      label: `Collector ${recipients.length + 1}`,
      isDefault: false
    };
    
    onRecipientsChange([...recipients, newRecipient]);
  };

  const handleRemoveRecipient = (index: number) => {
    if (recipients[index].isDefault) return;
    onRecipientsChange(recipients.filter((_, i) => i !== index));
  };

  const handleRecipientChange = (index: number, field: keyof RewardRecipient, value: string | number) => {
    const updated = [...recipients];
    updated[index] = { ...updated[index], [field]: value };
    onRecipientsChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* Fee Structure Info */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-blue-600">ℹ️</div>
          <h3 className="text-sm font-medium text-blue-900">Clanker v4 Fee Structure</h3>
        </div>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>Two-Layer System:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Protocol Fee (20%):</strong> Automatically deducted by Clanker hook during swaps</li>
            <li><strong>LP Fee Distribution:</strong> Remaining fees distributed among your chosen recipients</li>
          </ul>
          <p className="mt-3">
            <strong>Example:</strong> If you set 1% total fee → 0.2% to Clanker (automatic) + 0.8% to LP recipients
          </p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="useSimpleDistribution"
            checked={useSimpleDistribution}
            onChange={(e) => onUseSimpleDistributionChange(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="useSimpleDistribution" className="text-sm">
            Use simple distribution (75% You, 25% Platform)
            <InfoTooltip content="Simple 2-way split of LP fees. Clanker's 20% protocol fee is automatic." />
          </label>
        </div>

        {!useSimpleDistribution && (
          <>
            <div className="space-y-3">
              <label className="text-sm font-medium">Fee Collector Templates</label>
              <div className="grid gap-3">
                {FEE_COLLECTOR_TEMPLATES.map((template) => (
                  <div 
                    key={template.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedTemplate === template.id ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-200'
                    }`}
                    onClick={() => applyTemplate(template.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-gray-600">{template.description}</p>
                        <p className="text-xs text-blue-600 italic">{template.note}</p>
                      </div>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {template.recipients.length} collectors
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Collectors Management */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Custom Fee Collectors</label>
                <button
                  onClick={handleAddRecipient}
                  disabled={recipients.length >= 7}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Add Collector
                </button>
              </div>

              <div className="space-y-3">
                {recipients.map((recipient, index) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-3">
                        <label className="text-xs text-gray-600">Label</label>
                        <input
                          type="text"
                          value={recipient.label || ''}
                          onChange={(e) => handleRecipientChange(index, 'label', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="Collector name"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="text-xs text-gray-600">Recipient Address</label>
                        <input
                          type="text"
                          value={recipient.recipient}
                          onChange={(e) => handleRecipientChange(index, 'recipient', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded font-mono"
                          placeholder="0x..."
                          disabled={recipient.isDefault}
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-xs text-gray-600">Admin Address</label>
                        <input
                          type="text"
                          value={recipient.admin}
                          onChange={(e) => handleRecipientChange(index, 'admin', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded font-mono"
                          placeholder="0x..."
                          disabled={recipient.isDefault}
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="text-xs text-gray-600">%</label>
                        <input
                          type="number"
                          value={recipient.bps / 100}
                          onChange={(e) => handleRecipientChange(index, 'bps', Math.round(parseFloat(e.target.value || '0') * 100))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-1">
                        {!recipient.isDefault && (
                          <button
                            onClick={() => handleRemoveRecipient(index)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Remove collector"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Display current distribution */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium mb-3">Current Fee Distribution</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-600 font-medium">Clanker Protocol Fee:</span>
              <span className="font-mono">20% (automatic)</span>
            </div>
            <div className="border-t pt-2">
              <div className="text-gray-600 mb-1">LP Fee Distribution:</div>
              {recipients.map((recipient, index) => (
                <div key={index} className="flex justify-between ml-4">
                  <span>{recipient.label || `Collector ${index + 1}`}:</span>
                  <span className="font-mono">{(recipient.bps / 100).toFixed(2)}%</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>Total LP Distribution:</span>
              <span className="font-mono">{(recipients.reduce((sum, r) => sum + r.bps, 0) / 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Validation messages */}
        {!validation.isValid && (
          <div className="text-red-600 text-sm space-y-1">
            {validation.errors.map((error, index) => (
              <div key={index}>• {error}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FeeCollectorsManager;
export { FeeCollectorsManager };