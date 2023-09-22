import { Outlet } from "react-router-dom";

export function Root() {
  return (
    <div>
      <nav className="navbar navbar-light bg-light mb-2">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">
            Mediator
          </a>
          <div className="me-auto" />
          {/* right-aligned stuff */}
        </div>
      </nav>
      <div className="container">
        <Outlet />
      </div>
    </div>
  );
}
