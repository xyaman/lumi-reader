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

    For **development** you can seed users with SEED_USERS=1
    ```bash
    SEED_USERS=true rails db:seed
    ```

3. **Seed/Update Patreon Tiers**

    To fetch tier information from Patreon during seeding, configure the following environment variables:

    - `CAMPAIGN_ID` = `ENV["PATREON_CAMPAIGN_ID"]`
    - `CREATOR_ACCESS_TOKEN` = `ENV["PATREON_CREATOR_ACCESS_TOKEN"]`

    ```bash
    bundle exec rake patreon:sync_tiers
    ```

    All plan features are default to 0, so you need to enter manually the information
    Example: `book_sync_limit` is set to 0


4. To start the server, run:
    ```bash
    rails server
    ```

### Running tests

To run the test suite, run:
```bash
rails test
```
