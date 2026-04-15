import Sidebar from '@/components/Sidebar';
import { UserProvider } from '@/components/user-context';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-60 min-h-screen">
          {children}
        </main>
      </div>
    </UserProvider>
  );
}
