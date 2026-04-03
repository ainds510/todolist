import './page.css';

const loadingSkeletonItems = Array.from({ length: 4 }, (_, index) => index);

export default function Loading() {
  return (
    <div className="app-shell">
      <div className="main-layout">
        <main className="content-area">
          <div className="todo-card">
            <div className="task-skeleton-header" />
            <div className="task-composer">
              <div className="task-input-skeleton" />
              <div className="task-button-skeleton" />
            </div>
            <div className="task-skeleton-list" aria-hidden="true">
              {loadingSkeletonItems.map((item) => (
                <div key={item} className="task-skeleton-item">
                  <div className="task-skeleton-row">
                    <div className="task-skeleton-checkbox" />
                    <div className="task-skeleton-copy">
                      <div className="task-skeleton-title" />
                      <div className="task-skeleton-tag" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
