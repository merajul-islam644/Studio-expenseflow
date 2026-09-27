import { Modal } from "./Modal";

type Props = {
  busy?: boolean;
  cancelLabel?: string;
  confirmLabel?: string;
  destructive?: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
};

export function ConfirmDialog({
  busy,
  cancelLabel,
  confirmLabel,
  destructive,
  message,
  onCancel,
  onConfirm,
  open,
  title
}: Props) {
  if (!open) return null;
  return (
    <Modal title={title} onClose={onCancel}>
      <p>{message}</p>
      <div className="modal-actions">
        <button className="secondary-button" onClick={onCancel} disabled={busy}>
          {cancelLabel ?? "Cancel"}
        </button>
        <button className={destructive ? "danger-button" : "primary-button"} onClick={onConfirm} disabled={busy}>
          {confirmLabel ?? "Confirm"}
        </button>
      </div>
    </Modal>
  );
}
