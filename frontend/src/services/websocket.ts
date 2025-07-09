import { createConsumer } from "@rails/actioncable"

const WS_URL = import.meta.env.PROD ? "wss://api.lumireader.app/cable" : "ws://localhost:3000/cable"
export default createConsumer(WS_URL)
