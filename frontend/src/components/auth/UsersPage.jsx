import { useEffect, useState } from 'react';
import { listUsers } from '../../api/authApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { fmtDate } from '../../utils/format.js';
import { Card, Btn, Badge, Banner, Skeleton, EmptyState } from '../ui.jsx';
import { IconUsers, IconPlus, IconPen } from '../Icon.jsx';
import PageHeader from '../layout/PageHeader.jsx';
import UserModal from './UserModal.jsx';

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setUsers(await listUsers());
    } catch (e) {
      setError(e.message || 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Users"
        subtitle="Manage who can access the handover register."
        actions={
          <Btn variant="gold" sm icon={<IconPlus size={15} />} onClick={() => setModal({ mode: 'create' })}>
            Add user
          </Btn>
        }
      />

      {error && <Banner tone="error" role="alert">{error}</Banner>}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card>
          <EmptyState icon={<IconUsers size={26} />} title="No users yet">
            Add the first team member to give them access.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const isSelf = me && u.id === me.id;
            return (
              <Card key={u.id} className="!mb-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-navy/8 text-navy flex items-center justify-center font-semibold flex-none">
                    {(u.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold truncate">
                      {u.name} {isSelf && <span className="text-muted font-normal text-[12px]">(you)</span>}
                    </div>
                    <div className="text-[12.5px] text-muted truncate">{u.email}</div>
                    <div className="text-[11px] text-muted/80 mt-0.5">Added {fmtDate(u.createdAt)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-none">
                    <Badge variant={u.role === 'admin' ? 'pending' : 'neutral'}>{u.role}</Badge>
                    <Badge variant={u.active ? 'good' : 'damaged'} dot>{u.active ? 'Active' : 'Disabled'}</Badge>
                  </div>
                  <Btn variant="ghost" sm icon={<IconPen size={14} />} onClick={() => setModal({ mode: 'edit', user: u })}>
                    Edit
                  </Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {modal && (
        <UserModal
          mode={modal.mode}
          user={modal.user}
          isSelf={modal.user && me && modal.user.id === me.id}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
