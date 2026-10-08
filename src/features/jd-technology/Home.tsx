import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowRight, LockKeyhole, Layers3 } from "lucide-react";
import { apps } from "../../config/apps.config";
import { Orb } from "../../components/Orb";
export function Home() {
  return (
    <div className="platform-home">
      <div className="hero-heading">
        <p className="eyebrow">
          <span className="tiny-dot" /> YOUR WORK. A LITTLE SMARTER.
        </p>
        <h1>
          Business technology,
          <br />
          <span>built around you.</span>
        </h1>
        <p className="hero-description">
          Less friction. More focus. A growing collection of tools
          <br className="desktop-break" /> that give you space to do your best
          work.
        </p>
      </div>
      <div className="section-heading">
        <h2>Your workspace</h2>
        <span className="muted">One platform. More possibilities.</span>
      </div>
      <div className="apps-grid">
        {apps.map((app) =>
          app.id === "whiteboard" ? (
            <Link
              key={app.id}
              className="app-card future-card theme-blue"
              to={app.route}
            >
              <div className="card-top">
                <div className="tool-icon">
                  <app.icon size={24} />
                </div>
                <span className="pill active">READY TO WORK</span>
              </div>
              <h3>{app.name}</h3>
              <p className="muted">{app.description}</p>
              <div className="future-bottom">
                Clean up a photo <ArrowRight size={17} />
              </div>
            </Link>
          ) : app.id === "data" ? (
            <Link
              key={app.id}
              className="app-card future-card theme-orange"
              to={app.route}
            >
              <div className="card-top">
                <div className="tool-icon">
                  <app.icon size={24} />
                </div>
                <span className="pill active">READY TO WORK</span>
              </div>
              <h3>{app.name}</h3>
              <p className="muted">{app.description}</p>
              <div className="future-bottom">
                Open Data Tools <ArrowRight size={17} />
              </div>
            </Link>
          ) : app.status === "active" ? (
            <Link key={app.id} className="app-card lumo-card" to={app.route}>
              <div className="card-top">
                <span className="pill active">
                  <span className="tiny-dot" /> READY TO WORK
                </span>
                <ArrowUpRight size={22} />
              </div>
              <div className="lumo-card-content">
                <div>
                  <p className="eyebrow">MEET YOUR NEW ASSISTANT</p>
                  <h2>
                    Lumo<span className="orange">.</span>
                  </h2>
                  <p className="card-description">Meeting Assistant</p>
                  <p className="muted">
                    Stay in the conversation.
                    <br />
                    Lumo takes care of the next steps.
                  </p>
                </div>
                <Orb small />
              </div>
              <div className="card-bottom">
                <span>
                  Listen <i /> Capture <i /> Act
                </span>
                <span className="launch">
                  Open Lumo <ArrowRight size={17} />
                </span>
              </div>
            </Link>
          ) : (
            <div
              key={app.id}
              className={`app-card future-card theme-${app.theme}`}
              aria-disabled="true"
            >
              <div className="card-top">
                <div className="tool-icon">
                  <app.icon size={24} />
                </div>
                <span className="pill">COMING SOON</span>
              </div>
              <h3>{app.name}</h3>
              <p className="muted">{app.description}</p>
              <div className="future-bottom">
                More room to grow <LockKeyhole size={14} />
              </div>
            </div>
          ),
        )}
      </div>
      <div className="platform-note">
        <Layers3 size={19} />
        <span>Built to grow with you.</span>
        <span className="muted">Your next tool is just the beginning.</span>
      </div>
    </div>
  );
}
