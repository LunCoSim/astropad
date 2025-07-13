import React, { useState, useEffect } from 'react';
import { InfoTooltip } from './InfoTooltip';
import type { RewardRecipient } from '../../../lib/types';
// SVG Trash Icon
const TrashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="5" y="8" width="2" height="7" rx="1" fill="#e53e3e" />
    <rect x="9" y="8" width="2" height="7" rx="1" fill="#e53e3e" />
    <rect x="13" y="8" width="2" height="7" rx="1" fill="#e53e3e" />
    <rect x="4" y="5" width="12" height="2" rx="1" fill="#e2e8f0" />
    <rect x="7" y="2" width="6" height="2" rx="1" fill="#e2e8f0" />
    <rect x="2" y="5" width="16" height="2" rx="1" fill="#e2e8f0" />
  </svg>
);

type FeeCollectorsManagerProps = {
  recipients: RewardRecipient[];
  onRecipientsChange: (recipients: RewardRecipient[]) => void;
  validation: { isValid: boolean; errors: string[]; warnings: string[]; totalBps: number; maxCollectors: number; remainingBps: number; };
  totalFeeBps: number;
  defaultAddress: string;
};

const ASTROPAD_FEE_ADDRESS = '0x2eC50faa88b1CEeeB77bb36e7e31eb7C1FAeB348';
const ASTROPAD_FIXED_BPS = 2000; // 20% of LP

function ensureAstropadCollector(recipients: RewardRecipient[]): RewardRecipient[] {
  const withoutAstropad = recipients.filter(r => r.recipient.toLowerCase() !== ASTROPAD_FEE_ADDRESS.toLowerCase());
  const userBpsSum = withoutAstropad.reduce((sum, r) => sum + r.bps, 0);
  if (userBpsSum > 8000) {
    // Cap if over
    withoutAstropad[withoutAstropad.length - 1].bps -= (userBpsSum - 8000);
  }
  return [
    ...withoutAstropad,
    {
      recipient: ASTROPAD_FEE_ADDRESS,
      admin: ASTROPAD_FEE_ADDRESS, // Fixed, but can be made editable if needed
      bps: ASTROPAD_FIXED_BPS,
      token: 'Both',
      isFixed: true,
      label: 'Astropad',
    }
  ];
}

export { FeeCollectorsManager, ensureAstropadCollector };

export default function FeeCollectorsManager({
  recipients,
  onRecipientsChange,
  validation,
  totalFeeBps,
  defaultAddress,
}: FeeCollectorsManagerProps) {
  // Set useCustom to false by default (unchecked)
  const [useCustom, setUseCustom] = useState(false);

  // Enforce Astropad only if customizing
  const enforcedRecipients = useCustom ? ensureAstropadCollector(recipients) : recipients;
  // Only show editable recipients (hide Astropad from UI)
  const editableRecipients = enforcedRecipients.filter(r => !r.isFixed);

  const handleAddRecipient = () => {
    if (editableRecipients.length >= 6) return;
    const remainingBps = 8000 - editableRecipients.reduce((sum, r) => sum + r.bps, 0);
    const newBps = Math.floor(remainingBps / (editableRecipients.length + 1));
    const updated = editableRecipients.map(r => ({ ...r, bps: newBps }));
    onRecipientsChange(useCustom ? ensureAstropadCollector([...updated, { recipient: '', admin: '', bps: newBps, token: 'Both' }]) : [...updated, { recipient: '', admin: '', bps: newBps, token: 'Both' }]);
  };

  const handleRemoveRecipient = (index: number) => {
    onRecipientsChange(useCustom ? ensureAstropadCollector(editableRecipients.filter((_, i) => i !== index)) : editableRecipients.filter((_, i) => i !== index));
  };

  const handleRecipientChange = (index: number, field: keyof RewardRecipient, value: string | number | boolean) => {
    const updated = [...editableRecipients];
    updated[index] = { ...updated[index], [field]: value };
    onRecipientsChange(useCustom ? ensureAstropadCollector(updated) : updated);
  };

  // For percent-based UI, calculate total percent for all editableRecipients
  const totalPercent = editableRecipients.reduce((sum, r) => sum + (r.bps / 80), 0);

  useEffect(() => {
    if (!useCustom) {
      const defaultRecipients = [{ recipient: defaultAddress, admin: defaultAddress, bps: 8000, token: 'Both' }];
      // Only call onRecipientsChange if recipients are actually different
      const areEqual =
        recipients.length === defaultRecipients.length &&
        recipients.every((r, i) =>
          r.recipient === defaultRecipients[i].recipient &&
          r.admin === defaultRecipients[i].admin &&
          r.bps === defaultRecipients[i].bps &&
          r.token === defaultRecipients[i].token
        );
      if (!areEqual) {
        onRecipientsChange(defaultRecipients);
      }
    }
  }, [useCustom, onRecipientsChange, defaultAddress, recipients]);

  // When recipients change, always send bps-mapped recipients to parent
  useEffect(() => {
    if (useCustom) {
      onRecipientsChange(ensureAstropadCollector(recipients));
    }
  }, [JSON.stringify(recipients)]);

  return (
    <div className="space-y-lg p-6 bg-gray-50 rounded-2xl shadow-md">
      <label className="flex items-center space-x-md cursor-pointer">
        <input type="checkbox" checked={useCustom} onChange={e => setUseCustom(e.target.checked)} className="rounded" />
        <span className="form-label">Customize Fee Recipients</span>
      </label>
      {useCustom && (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Fee Recipients</h3>
            <hr className="mb-4 border-gray-200" />
            {editableRecipients.map((r, index) => {
              const percent = r.bps / 80;
              return (
                <div key={index} className="mb-8">
                  {index > 0 && <hr className="my-6 border-t border-gray-200" />}
                  <div className="mb-2 text-xs text-muted font-semibold uppercase tracking-wide">Recipient {index + 1}</div>
                  <div className="mb-2">
                    <label className="form-label font-medium" htmlFor={`recipient-address-${index}`}>Recipient Address <span className="text-red-500">*</span></label>
                    <input
                      id={`recipient-address-${index}`}
                      className="input w-full"
                      value={r.recipient}
                      onChange={e => handleRecipientChange(index, 'recipient', e.target.value)}
                      placeholder="e.g. 0x123..."
                      required
                    />
                    <div className="flex justify-end mt-1">
                      <button
                        className="btn btn-danger btn-xs flex items-center justify-center px-2 py-1 rounded"
                        style={{ height: '28px', minWidth: '28px' }}
                        title="Remove recipient"
                        aria-label="Remove recipient"
                        tabIndex={0}
                        onClick={() => handleRemoveRecipient(index)}
                        type="button"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label font-medium" htmlFor={`recipient-fee-${index}`}>Fee (%) <span className="text-red-500">*</span></label>
                    <input
                      id={`recipient-fee-${index}`}
                      className="input w-full"
                      type="number"
                      value={percent}
                      onChange={e => {
                        const newPercent = Number(e.target.value);
                        const bps = Math.round(newPercent * 80);
                        handleRecipientChange(index, 'bps', bps);
                      }}
                      min="0"
                      max="100"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label font-medium" htmlFor={`recipient-token-${index}`}>Receive fee in token?</label>
                    <select
                      id={`recipient-token-${index}`}
                      className="input w-full"
                      value={r.token}
                      onChange={e => handleRecipientChange(index, 'token', e.target.value)}
                    >
                      <option>Both</option>
                      <option>Paired</option>
                      <option>Clanker</option>
                    </select>
                    <span className="form-helper text-xs text-muted">Both: Split between the paired token (e.g., ETH) and your new token (“Clanker”). Paired: Only the paired token (e.g., ETH). Clanker: Only your new token (the one you are creating now).</span>
                  </div>
                </div>
              );
            })}
          </div>
          {editableRecipients.length < 6 && (
            <div className="flex justify-end mb-6">
              <button
                className="btn btn-primary flex items-center gap-2 px-4 py-2 rounded-lg shadow hover:shadow-md transition"
                onClick={handleAddRecipient}
                title="Add Recipient"
              >
                <span className="text-xl font-bold">+</span>
                <span className="text-base font-medium">Add Recipient</span>
              </button>
            </div>
          )}
          {/* Total allocation explanation */}
          <div className="mb-2 text-sm text-muted text-center">
            <div className="font-semibold">Sum of all recipient shares (below) must be exactly 100%.</div>
            <div className="text-xs mt-1">This controls how your total user fee is split among recipients.</div>
          </div>
          {/* Progress bar and warning for percent allocation */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${totalPercent !== 100 ? 'bg-red-400' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(totalPercent, 100)}%` }}
            ></div>
          </div>
          {totalPercent !== 100 && (
            <div className="text-xs text-red-600 font-semibold mb-1 text-center">Total recipient shares must add up to exactly 100%.</div>
          )}
          <div className="text-sm text-muted text-center mb-4">Total user fee to be distributed: <b>{totalPercent}%</b></div>
        </div>
      )}
    </div>
  );
}