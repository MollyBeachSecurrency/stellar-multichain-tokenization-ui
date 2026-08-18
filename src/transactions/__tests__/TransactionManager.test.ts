import { describe, it, expect, vi } from "vitest";
import { TransactionManager } from "../TransactionManager";

describe("TransactionManager", () => {
  it("starts in idle state", () => {
    const manager = new TransactionManager("stellar");
    expect(manager.getState().status).toBe("idle");
    expect(manager.getState().chain).toBe("stellar");
    expect(manager.getState().hash).toBeNull();
    expect(manager.getState().error).toBeNull();
  });

  it("transitions through valid states", () => {
    const manager = new TransactionManager("stellar");

    manager.transition("preparing");
    expect(manager.getState().status).toBe("preparing");

    manager.transition("simulating");
    expect(manager.getState().status).toBe("simulating");

    manager.transition("awaiting_signature");
    expect(manager.getState().status).toBe("awaiting_signature");

    manager.transition("submitting");
    expect(manager.getState().status).toBe("submitting");

    manager.transition("pending");
    expect(manager.getState().status).toBe("pending");

    manager.transition("confirmed");
    expect(manager.getState().status).toBe("confirmed");

    manager.transition("indexing");
    expect(manager.getState().status).toBe("indexing");

    manager.transition("success");
    expect(manager.getState().status).toBe("success");
  });

  it("throws on invalid transitions", () => {
    const manager = new TransactionManager("ethereum");

    // Cannot go from idle to confirmed
    expect(() => manager.transition("confirmed")).toThrow(
      "Invalid transaction transition: idle -> confirmed"
    );
  });

  it("notifies listeners on state changes", () => {
    const manager = new TransactionManager("ethereum");
    const listener = vi.fn();

    manager.subscribe(listener);
    manager.transition("preparing");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ status: "preparing" })
    );
  });

  it("unsubscribes correctly", () => {
    const manager = new TransactionManager("stellar");
    const listener = vi.fn();

    const unsub = manager.subscribe(listener);
    manager.transition("preparing");
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    manager.transition("simulating");
    expect(listener).toHaveBeenCalledTimes(1); // Not called again
  });

  it("sets hash on setHash", () => {
    const manager = new TransactionManager("ethereum");
    manager.transition("preparing");
    manager.setHash("0xabc123");

    expect(manager.getState().hash).toBe("0xabc123");
  });

  it("transitions to error state with fail()", () => {
    const manager = new TransactionManager("stellar");
    manager.transition("preparing");
    manager.fail({
      category: "network",
      message: "Connection lost",
      retryable: true,
    });

    expect(manager.getState().status).toBe("error");
    expect(manager.getState().error?.message).toBe("Connection lost");
    expect(manager.getState().error?.retryable).toBe(true);
  });

  it("resets to idle", () => {
    const manager = new TransactionManager("ethereum");
    manager.transition("preparing");
    manager.setHash("0xabc");
    manager.reset();

    expect(manager.getState().status).toBe("idle");
    expect(manager.getState().hash).toBeNull();
    expect(manager.getState().error).toBeNull();
    expect(manager.getState().chain).toBe("ethereum");
  });

  it("execute() runs the full lifecycle", async () => {
    const manager = new TransactionManager("stellar");

    const result = await manager.execute(async (controls) => {
      controls.simulate();
      controls.awaitSignature();
      controls.submit("0xhash123");
      controls.pending();
      controls.confirm();
      controls.success();
      return "done";
    });

    expect(result).toBe("done");
    expect(manager.getState().status).toBe("success");
    expect(manager.getState().hash).toBe("0xhash123");
  });

  it("execute() catches errors and transitions to error state", async () => {
    const manager = new TransactionManager("ethereum");

    await expect(
      manager.execute(async (controls) => {
        controls.awaitSignature();
        throw new Error("User rejected");
      })
    ).rejects.toThrow("User rejected");

    expect(manager.getState().status).toBe("error");
    expect(manager.getState().error?.message).toBe("User rejected");
  });
});
