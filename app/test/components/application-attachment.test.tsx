import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * AN ATTACHMENT THAT WOULD NOT UPLOAD IS A DECISION, NOT A WARNING.
 *
 * A freelancer attached their CV, the upload failed because the file store was
 * unreachable, and the dialog toasted "submitting without attachment" and went
 * straight on to the chain. What reached the client was a cover letter
 * describing a portfolio, with no portfolio — and an application cannot be
 * amended once it is on chain, so there was nothing anyone could do after the
 * fact. The toast was accurate and useless: it reported a decision that had
 * already been taken on the applicant's behalf.
 *
 * Everything here is about who chooses.
 */

const uploadMilestoneFile = vi.fn();
vi.mock("@/lib/api", () => ({
  isApiConfigured: () => true,
  postCoverLetterDraft: vi.fn(),
  uploadMilestoneFile: (...a: unknown[]) => uploadMilestoneFile(...a),
}));

vi.mock("wagmi", () => ({
  useSignMessage: () => ({ signMessageAsync: vi.fn().mockResolvedValue("0xsig") }),
}));

vi.mock("@/contexts/web3-context", () => ({
  useWeb3: () => ({ wallet: { address: "0xBA7E939394697E1C3374e2695771DEbbD14D7560", isConnected: true } }),
}));

vi.mock("@/hooks/use-job-manager", () => ({ useJobManager: () => ({ manager: null }) }));
vi.mock("@/components/jobs/job-criteria", () => ({ JobCriteria: () => null }));

const { ApplicationDialog } = await import("@/components/jobs/application-dialog");

const job = {
  id: "1",
  projectTitle: "mytube",
  totalAmount: "500000",
  milestones: [],
} as never;

const onApply = vi.fn();

function open() {
  return render(
    <ApplicationDialog job={job} open onOpenChange={() => {}} onApply={onApply} applying={false} />,
  );
}

/**
 * Fill the two required fields and attach a file.
 *
 * The text goes in with fireEvent rather than user.type: typing is one React
 * render per keystroke, which is fine alone and slow enough under a full
 * parallel run to blow the timeout. What is under test is the upload
 * decision, not the keyboard.
 */
async function fillItIn() {
  const user = userEvent.setup();
  fireEvent.change(screen.getByLabelText(/cover letter/i), {
    target: { value: "I would like to do this work." },
  });
  fireEvent.change(screen.getByLabelText(/proposed timeline/i), {
    target: { value: "10" },
  });

  const file = new File(["cv"], "Mary Modupeola CV.pdf", { type: "application/pdf" });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input, file);
  return user;
}

beforeEach(() => {
  onApply.mockReset();
  uploadMilestoneFile.mockReset();
});

describe("when the attachment cannot be uploaded", () => {
  beforeEach(() => {
    uploadMilestoneFile.mockRejectedValue(new Error("Storage is unreachable"));
  });

  it("does not send the application", async () => {
    open();
    const user = await fillItIn();

    fireEvent.click(screen.getByRole("button", { name: /submit application/i }));

    await waitFor(() => expect(uploadMilestoneFile).toHaveBeenCalled(), { timeout: 8000 });
    /* The whole point. It used to reach the chain here, CV-less. */
    expect(onApply).not.toHaveBeenCalled();
  });

  it("says which file, why, and that nothing has been sent", async () => {
    open();
    const user = await fillItIn();

    fireEvent.click(screen.getByRole("button", { name: /submit application/i }));

    const alert = await screen.findByRole("alert", {}, { timeout: 8000 });
    expect(alert).toHaveTextContent(/Mary Modupeola CV\.pdf/);
    expect(alert).toHaveTextContent(/Storage is unreachable/);
    expect(alert).toHaveTextContent(/has not been sent/i);
  });

  it("lets the applicant go ahead without it, once they have chosen to", async () => {
    open();
    const user = await fillItIn();

    fireEvent.click(screen.getByRole("button", { name: /submit application/i }));
    await screen.findByRole("alert", {}, { timeout: 8000 });

    fireEvent.click(screen.getByRole("button", { name: /apply without the attachment/i }));

    await waitFor(() => expect(onApply).toHaveBeenCalled(), { timeout: 8000 });
    /* No attachment url, and no second attempt at an upload that just failed. */
    expect(onApply.mock.calls[0][3]).toBeUndefined();
    expect(uploadMilestoneFile).toHaveBeenCalledTimes(1);
  });

  it("offers a retry, for a store that was only briefly down", async () => {
    open();
    const user = await fillItIn();

    fireEvent.click(screen.getByRole("button", { name: /submit application/i }));
    await screen.findByRole("alert", {}, { timeout: 8000 });

    uploadMilestoneFile.mockResolvedValue({ url: "https://files/cv.pdf", filename: "cv.pdf" });
    fireEvent.click(screen.getByRole("button", { name: /try the upload again/i }));

    await waitFor(() => expect(onApply).toHaveBeenCalled(), { timeout: 8000 });
    expect(onApply.mock.calls[0][3]).toBe("https://files/cv.pdf");
  });
});

describe("when the upload works", () => {
  it("sends the application with the attachment, no extra clicks", async () => {
    uploadMilestoneFile.mockResolvedValue({ url: "https://files/cv.pdf", filename: "cv.pdf" });
    open();
    const user = await fillItIn();

    fireEvent.click(screen.getByRole("button", { name: /submit application/i }));

    await waitFor(() => expect(onApply).toHaveBeenCalled(), { timeout: 8000 });
    expect(onApply.mock.calls[0][3]).toBe("https://files/cv.pdf");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
