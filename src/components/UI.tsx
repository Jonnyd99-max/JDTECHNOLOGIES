import { useEffect, useRef, type ReactNode } from "react";
import { X, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose(): void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const dialog = ref.current;
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="modal-head">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  back = "/lumo",
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  back?: string;
  children?: ReactNode;
}) {
  return (
    <>
      <Link to={back} className="back-link">
        <ArrowLeft size={16} /> Back
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {description && <p className="muted">{description}</p>}
        </div>
        {children}
      </div>
    </>
  );
}
