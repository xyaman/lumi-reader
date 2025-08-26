# Lumi Reader Backend

### Dependencies

- Ruby `3.4.4`

### Deployment

1.  **Create and migrate the database:**
    ```bash
    rails db:create
    rails db:migrate
    ```

2.  **Seed the database:**

    You must seed the database with initial data.
    ```bash
    rails db:seed
    ```

    For **development** you can also seed users with SEED_USERS=1
    ```bash
    SEED_USERS=true rails db:seed
    ```

3. To start the server, run:
    ```bash
    rails server
    ```


4.  The application is deployed using Kamal.
    To seed the database with only user plans:
    ```bash
    kamal app exec -i 'rails db:seed'
    ```

### Running tests

To run the test suite, run:
```bash
rails test
```
