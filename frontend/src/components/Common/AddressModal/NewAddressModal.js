export default function NewAddressModal({ open, onClose, onCreated }) {
  if (!open) return null;
  if (onCreated) onCreated(null);
  if (onClose) onClose();
  return null;
}

