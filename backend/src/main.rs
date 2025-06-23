use axum::Router;
use tower_http::services::{ServeDir, ServeFile};

#[tokio::main]
async fn main() {
    let serve_dir = ServeDir::new("dist").not_found_service(ServeFile::new("dist/index.html"));
    let router = Router::new().fallback_service(serve_dir);


    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await.expect("Can't open tcp server");
    println!("Listening on port 3000");
    axum::serve(listener, router).await.expect("Cant start the service");
}
