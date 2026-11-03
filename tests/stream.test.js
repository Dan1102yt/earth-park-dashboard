import { llamarClaudeStream } from "../src/modulos/marketing/agente/agenteApi";

it("arma la respuesta desde el stream", async () => {
  const sse = [
    { type: "message_start" },
    { type: "content_block_start", index: 0, content_block: { type: "server_tool_use", name: "web_search" } },
    { type: "content_block_start", index: 1, content_block: { type: "web_search_tool_result", content: [{ url: "https://a.co" }] } },
    { type: "content_block_start", index: 2, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 2, delta: { type: "text_delta", text: '{"resumen":' } },
    { type: "content_block_delta", index: 2, delta: { type: "text_delta", text: '"hola"}' } },
    { type: "message_stop" },
  ].map((e) => `event: x\ndata: ${JSON.stringify(e)}\n\n`).join("");
  const partes = [sse.slice(0, 50), sse.slice(50, 333), sse.slice(333)];
  global.fetch = async () => ({ ok: true, body: new ReadableStream({ start(c) { partes.forEach((p) => c.enqueue(new TextEncoder().encode(p))); c.close(); } }) });
  const r = await llamarClaudeStream("x", {});
  expect(r.content[2].text).toBe('{"resumen":"hola"}');
  expect(r.content[1].content[0].url).toBe("https://a.co");
});
