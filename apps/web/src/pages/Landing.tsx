import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  ChefHat,
  CreditCard,
  LayoutDashboard,
  QrCode,
  ScanLine,
  Table2,
  UsersRound,
  Utensils,
  LogOut,
} from 'lucide-react';
import './landing.css';

gsap.registerPlugin(ScrollTrigger);

type DemoStep = 'table' | 'menu' | 'kitchen' | 'bill';

const workflowSteps = [
  { key: 'table', label: 'Table', detail: 'Seat the room with reservations, walk-ins, and a clear live status.' },
  { key: 'menu', label: 'Order', detail: 'A QR scan opens the right menu. Waiters can step in without breaking the flow.' },
  { key: 'kitchen', label: 'Kitchen', detail: 'Every round arrives with a table, a time, and one unambiguous next action.' },
  { key: 'bill', label: 'Bill', detail: 'Combine the entire session, apply a discount, record payment, and close the table.' },
] as const;

const roles = [
  ['Customer', 'Scan, browse, order, and follow the meal from the table.', Utensils],
  ['Waiter', 'Open sessions, add rounds, and keep service moving.', UsersRound],
  ['Kitchen', 'Move orders from placed to preparing to ready.', ChefHat],
  ['Cashier', 'Settle the full session with one accurate bill.', CreditCard],
  ['Admin', 'See tables, people, reports, and the details behind service.', LayoutDashboard],
] as const;

function WorkflowGraphic({ active }: { active: DemoStep }) {
  return (
    <div className="landing-graphic" aria-label="Restaurant workflow illustration">
      <div className="graphic-grid" />
      <div className="graphic-table">
        <span className="graphic-table-number">12</span>
        <span className="graphic-table-label">TABLE</span>
        <span className="graphic-seat seat-one" />
        <span className="graphic-seat seat-two" />
        <span className="graphic-seat seat-three" />
        <span className="graphic-seat seat-four" />
        <div className="graphic-plate">
          <div className="graphic-plate-inner" />
        </div>
        <div className="graphic-qr"><QrCode size={28} strokeWidth={1.5} /></div>
      </div>
      <div className={`graphic-ticket ticket-menu ${active === 'menu' || active === 'kitchen' || active === 'bill' ? 'is-live' : ''}`}>
        <span>ORDER 014</span>
        <strong>2 × Margherita</strong>
        <small>TABLE 12 · PLACED</small>
      </div>
      <div className={`graphic-ticket ticket-kitchen ${active === 'kitchen' || active === 'bill' ? 'is-live' : ''}`}>
        <span>KITCHEN</span>
        <strong>{active === 'bill' ? 'READY' : 'PREPARING'}</strong>
        <small>ROUND 01 · 2 ITEMS</small>
      </div>
      <div className={`graphic-ticket ticket-bill ${active === 'bill' ? 'is-live' : ''}`}>
        <span>SESSION 101</span>
        <strong>₹945.00</strong>
        <small>{active === 'bill' ? 'PAID · UPI' : 'COMBINED BILL'}</small>
      </div>
      <div className="graphic-line line-one" />
      <div className="graphic-line line-two" />
      <div className="graphic-line line-three" />
    </div>
  );
}

function InteractiveDemo() {
  const [step, setStep] = useState<DemoStep>('table');
  const stepIndex = workflowSteps.findIndex((item) => item.key === step);
  const current = workflowSteps[stepIndex];

  const advance = () => {
    setStep(workflowSteps[Math.min(stepIndex + 1, workflowSteps.length - 1)].key);
  };

  return (
    <section className="landing-demo section-shell" id="product">
      <div className="section-heading demo-heading">
        <span className="section-kicker">A working thread</span>
        <h2>See what happens after the scan.</h2>
        <p>Move through a single table session. The same context follows the customer, the kitchen, and the cashier.</p>
      </div>
      <div className="demo-layout">
        <div className="demo-stage">
          <WorkflowGraphic active={step} />
          <div className="demo-stage-caption">
            <span>LIVE WALKTHROUGH</span>
            <span>TABLE 12 / SESSION 101</span>
          </div>
        </div>
        <div className="demo-controls">
          <div className="demo-progress" aria-label={`Step ${stepIndex + 1} of ${workflowSteps.length}`}>
            {workflowSteps.map((item, index) => (
              <button
                className={`demo-step ${index <= stepIndex ? 'is-complete' : ''} ${item.key === step ? 'is-current' : ''}`}
                key={item.key}
                onClick={() => setStep(item.key)}
                type="button"
              >
                <span className="demo-step-index">{index < stepIndex ? <Check size={13} /> : `0${index + 1}`}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <div className="demo-copy">
            <span className="demo-copy-label">NOW SHOWING</span>
            <h3>{current.label}</h3>
            <p>{current.detail}</p>
            <button className="text-button" onClick={advance} type="button">
              {stepIndex === workflowSteps.length - 1 ? 'Replay from table' : `Continue to ${workflowSteps[stepIndex + 1].label}`}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const pageRef = useRef<HTMLDivElement>(null);
  const { user, isLoading: isAuthLoading, logout, isLoggingOut } = useAuth();

  useEffect(() => {
    if (!pageRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const context = gsap.context(() => {
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro
        .from('.landing-nav', { y: -20, opacity: 0, duration: 0.7 })
        .from('.hero-kicker, .hero-title-line, .hero-copy, .hero-actions', { y: 26, opacity: 0, stagger: 0.08, duration: 0.75 }, '-=0.35')
        .from('.hero-visual', { scale: 0.94, opacity: 0, duration: 1.1 }, '-=0.65');

      gsap.utils.toArray<HTMLElement>('.story-panel').forEach((panel) => {
        gsap.from(panel, {
          y: 48,
          opacity: 0,
          duration: 0.85,
          ease: 'power3.out',
          scrollTrigger: { trigger: panel, start: 'top 78%', once: true },
        });
      });

      gsap.to('.hero-visual', {
        yPercent: 8,
        rotate: 1,
        ease: 'none',
        scrollTrigger: { trigger: '.landing-hero', start: 'top top', end: 'bottom top', scrub: 1 },
      });

      gsap.from('.role-row', {
        x: -24,
        opacity: 0,
        stagger: 0.1,
        duration: 0.65,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.roles-list', start: 'top 80%', once: true },
      });
    }, pageRef);
    return () => context.revert();
  }, []);

  return (
    <div ref={pageRef} className="landing-page">
      <header className="landing-nav">
        <Link to="/" className="landing-brand" aria-label="RMS home">
          <span className="brand-mark"><Table2 size={16} /></span>
          <span>RMS</span>
        </Link>
        <nav className="landing-links" aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#workflow">How it works</a>
          <a href="#roles">Roles</a>
        </nav>
        <div className="landing-nav-actions">
          {!isAuthLoading && !user && (
            <Link to="/login" className="nav-login">Log in</Link>
          )}
          {!isAuthLoading && user && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await logout();
                } catch (err) {
                  console.error('Logout failed', err);
                }
              }}
              disabled={isLoggingOut}
              className="nav-login inline-flex items-center gap-2 disabled:opacity-50"
            >
              <LogOut size={15} />
              {isLoggingOut ? 'Logging out...' : 'Log out'}
            </button>
          )}
          <Link to={user ? '/tables' : '/signup'} className="nav-cta">Open the system <ArrowUpRightIcon /></Link>
        </div>
      </header>

      <main>
        <section className="landing-hero section-shell">
          <div className="hero-copy-wrap">
            <span className="hero-kicker">Restaurant operations, connected</span>
            <h1 className="hero-title">
              <span className="hero-title-line">Every table.</span>
              <span className="hero-title-line hero-title-indent">Every <em>order.</em></span>
              <span className="hero-title-line">One system.</span>
            </h1>
            <p className="hero-copy">From the first scan to the final bill, RMS keeps the whole dining room moving as one.</p>
            <div className="hero-actions">
              <Link to="/signup" className="button button-primary">Explore RMS <ArrowDownRight size={17} /></Link>
              <a href="#product" className="button button-secondary">See the workflow</a>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <WorkflowGraphic active="menu" />
            <div className="hero-visual-note note-top"><ScanLine size={14} /> QR TO MENU</div>
            <div className="hero-visual-note note-bottom">ONE TABLE / MANY ROUNDS</div>
          </div>
        </section>

        <section className="statement-band section-shell">
          <p>Service is a sequence of small handoffs.</p>
          <h2>RMS gives every handoff<br /><em>somewhere to go.</em></h2>
        </section>

        <section className="story-section section-shell" id="workflow">
          <div className="story-panel story-dark">
            <div>
              <span className="section-kicker">01 / The table</span>
              <h2>Start with a room<br />that makes sense.</h2>
            </div>
            <div className="story-detail">
              <Table2 size={22} />
              <p>See availability, reservations, occupancy, and billing status without hunting through separate tools.</p>
            </div>
            <div className="table-strip">
              {['01 AVAILABLE', '02 RESERVED', '03 OCCUPIED', '04 BILLING'].map((item, index) => (
                <div className={`table-strip-cell cell-${index + 1}`} key={item}>{item}</div>
              ))}
            </div>
          </div>
          <div className="story-panel story-light">
            <div className="story-light-copy">
              <span className="section-kicker">02 / The handoff</span>
              <h2>A QR code is<br /><em>the first hello.</em></h2>
              <p>Each table has a real route into the menu. No table selection after the scan. No lost context.</p>
              <Link to="/signup" className="text-button">Try the customer flow <ArrowRight size={16} /></Link>
            </div>
            <div className="qr-card">
              <QrCode size={108} strokeWidth={1.1} />
              <span>TABLE 12</span>
              <small>SCAN TO ORDER</small>
            </div>
          </div>
        </section>

        <InteractiveDemo />

        <section className="roles-section section-shell" id="roles">
          <div className="section-heading">
            <span className="section-kicker">Different jobs. Same service.</span>
            <h2>Built around the people<br />who keep the room alive.</h2>
          </div>
          <div className="roles-list">
            {roles.map(([name, detail, Icon], index) => (
              <div className="role-row" key={name}>
                <span className="role-number">0{index + 1}</span>
                <Icon size={20} strokeWidth={1.5} />
                <h3>{name}</h3>
                <p>{detail}</p>
                <ArrowUpRightIcon />
              </div>
            ))}
          </div>
        </section>

        <section className="closing-section section-shell">
          <div className="closing-rule" />
          <span className="section-kicker">Keep the room moving</span>
          <h2>One table.<br /><em>One connected experience.</em></h2>
          <p>Give every role the context they need, exactly when they need it.</p>
          <Link to={user ? '/tables' : '/signup'} className="button button-primary">Open the system <ArrowRight size={17} /></Link>
        </section>
      </main>

      <footer className="landing-footer section-shell">
        <Link to="/" className="landing-brand"><span className="brand-mark"><Table2 size={16} /></span><span>RMS</span></Link>
        <p>Restaurant operations from table to checkout.</p>
        <div className="footer-links">
          <a href="#product">Product</a>
          <a href="#workflow">How it works</a>
          {!isAuthLoading && !user && <Link to="/login">Log in</Link>}
        </div>
        <span className="footer-copy">Built for a clearer service.</span>
      </footer>
    </div>
  );
}

function ArrowUpRightIcon() {
  return <ArrowUpRightIconInner />;
}

function ArrowUpRightIconInner() {
  return <ArrowDownRight size={15} className="arrow-up-right" />;
}
