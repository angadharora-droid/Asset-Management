import { useState } from 'react';
import { createUser, updateUser } from '../../api/authApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Btn, Banner, Label, inputCls, selectCls } from '../ui.jsx';
import { IconCheck } from '../Icon.jsx';
import Modal from '../Modal.jsx';

export default function UserModal({ mode, user, isSelf, onClose, onSaved }) {
  const showToast = useToast();
  const editing = mode === 'edit';
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'member',
    active: user ? user.active : true,
    password: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setError('');
    if (!form.name.trim()) return setError('Name is required.');
    if (!editing) {
      if (!form.email.trim()) return setError('Email is required.');
      if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    } else if (form.password && form.password.length < 8) {
      return setError('Password must be at least 8 characters.');
    }
    setSaving(true);
    try {
      if (editing) {
        const payload = { name: form.name.trim(), role: form.role, active: form.active };
        if (form.password) payload.password = form.password;
        await updateUser(user.id, payload);
        showToast('User updated', 'success');
      } else {
        await createUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        });
        showToast('User created', 'success');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save user.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      onClose={onClose}
      size="sm"
      ariaLabel={editing ? 'Edit user' : 'Add user'}
      header={<div className="font-serif text-[18px] text-navy">{editing ? 'Edit user' : 'Add user'}</div>}
      footer={
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={saving} className="flex-1">
            Cancel
          </Btn>
          <Btn variant="primary" onClick={save} loading={saving} icon={!saving && <IconCheck size={16} />} className="flex-1">
            {editing ? 'Save' : 'Create user'}
          </Btn>
        </div>
      }
    >
      {error && <Banner tone="error" role="alert" className="!mb-3">{error}</Banner>}

      <Label required className="!mt-0">Full name</Label>
      <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. A. Sharma" />

      <Label required>Email</Label>
      <input
        className={`${inputCls} ${editing ? 'opacity-60' : ''}`}
        type="email"
        value={form.email}
        onChange={(e) => set('email', e.target.value)}
        placeholder="name@centrepoint.local"
        disabled={editing}
        autoComplete="off"
      />
      {editing && <div className="text-[11.5px] text-muted mt-1">Email can't be changed.</div>}

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label>Role</Label>
          <select className={selectCls} value={form.role} onChange={(e) => set('role', e.target.value)} disabled={isSelf}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {editing && (
          <div>
            <Label>Account</Label>
            <select
              className={selectCls}
              value={form.active ? 'active' : 'disabled'}
              onChange={(e) => set('active', e.target.value === 'active')}
              disabled={isSelf}
            >
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        )}
      </div>
      {isSelf && <div className="text-[11.5px] text-muted mt-1">You can't change your own role or disable yourself.</div>}

      <Label>
        {editing ? 'Reset password (optional)' : 'Password'} {!editing && <span className="text-damaged">*</span>}
      </Label>
      <div className="relative">
        <input
          className={`${inputCls} !pr-16`}
          type={showPw ? 'text' : 'password'}
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          placeholder={editing ? 'Leave blank to keep current' : 'At least 8 characters'}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShowPw((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-navy hover:text-gold px-1.5 py-1
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light rounded"
        >
          {showPw ? 'Hide' : 'Show'}
        </button>
      </div>
    </Modal>
  );
}
