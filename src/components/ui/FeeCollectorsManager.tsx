import React, { useState, useEffect } from 'react';
import { InfoTooltip } from './InfoTooltip';
import type { RewardRecipient } from '../../lib/types.ts';

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
      customAdmin: false,
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
  const [useCustom, setUseCustom] = useState(false);

  // Enforce Astropad
  const enforcedRecipients = ensureAstropadCollector(recipients);
  const editableRecipients = enforcedRecipients.filter(r => !r.isFixed);

  const handleAddRecipient = () => {
    if (editableRecipients.length >= 6) return;
    const remainingBps = 8000 - editableRecipients.reduce((sum, r) => sum + r.bps, 0);
    const newBps = Math.floor(remainingBps / (editableRecipients.length + 1));
    const updated = editableRecipients.map(r => ({ ...r, bps: newBps }));
    onRecipientsChange(ensureAstropadCollector([...updated, { recipient: '', admin: '', bps: newBps, token: 'Both', customAdmin: false }]));
  };

  const handleRemoveRecipient = (index: number) => {
    onRecipientsChange(ensureAstropadCollector(editableRecipients.filter((_, i) => i !== index)));
  };

  const handleRecipientChange = (index: number, field: keyof RewardRecipient, value: string | number | boolean) => {
    const updated = [...editableRecipients];
    updated[index] = { ...updated[index], [field]: value };
    onRecipientsChange(ensureAstropadCollector(updated));
  };

  // Dynamic example
  const totalFeePercent = (totalFeeBps / 100).toFixed(2);
  const clankerPercent = (totalFeeBps * 0.2 / 100).toFixed(2);
  const lpPortion = totalFeeBps * 0.8 / 100;
  const astropadPercent = (lpPortion * 0.2).toFixed(2);
  const userPercent = (lpPortion * 0.8).toFixed(2);

  useEffect(() => {
    if (!useCustom) {
      const defaultRecipients = ensureAstropadCollector([{ recipient: defaultAddress, admin: defaultAddress, bps: 8000, token: 'Both', customAdmin: false }]);
      // Only call onRecipientsChange if recipients are actually different
      const areEqual =
        enforcedRecipients.length === defaultRecipients.length &&
        enforcedRecipients.every((r, i) =>
          r.recipient === defaultRecipients[i].recipient &&
          r.admin === defaultRecipients[i].admin &&
          r.bps === defaultRecipients[i].bps &&
          r.token === defaultRecipients[i].token &&
          r.customAdmin === defaultRecipients[i].customAdmin
        );
      if (!areEqual) {
        onRecipientsChange(defaultRecipients);
      }
    }
  }, [useCustom, onRecipientsChange, defaultAddress, enforcedRecipients]);

  return (
    <div className="space-y-lg">
      <label className="flex items-center space-x-md cursor-pointer">
        <input type="checkbox" checked={useCustom} onChange={e => setUseCustom(e.target.checked)} className="rounded" />
        <span className="form-label">Customize Fee Recipients</span>
      </label>
      {useCustom && (
        <div>
          {/* List editable recipients */}
          {editableRecipients.map((r, index) => (
            <div key={index} className="form-group grid grid-cols-5 gap-md">
              <input className="input" value={r.recipient} onChange={e => handleRecipientChange(index, 'recipient', e.target.value)} placeholder="Recipient 0x..." />
              <input className="input" type="number" value={r.bps} onChange={e => handleRecipientChange(index, 'bps', Number(e.target.value))} min="0" max="8000" />
              <select className="input" value={r.token} onChange={e => handleRecipientChange(index, 'token', e.target.value)}>
                <option>Both</option>
                <option>Paired</option>
                <option>Clanker</option>
              </select>
              <label className="flex items-center">
                <input type="checkbox" checked={r.customAdmin || false} onChange={e => handleRecipientChange(index, 'customAdmin', e.target.checked)} />
                Custom Admin
              </label>
              {r.customAdmin && <input className="input" value={r.admin} onChange={e => handleRecipientChange(index, 'admin', e.target.value)} placeholder="Admin 0x..." />}
              <button className="btn btn-danger" onClick={() => handleRemoveRecipient(index)}>Remove</button>
            </div>
          ))}
          {editableRecipients.length < 6 && <button className="btn btn-primary" onClick={handleAddRecipient}>Add Recipient</button>}
        </div>
      )}
    </div>
  );
}