/** Stand-in for federated remote modules in shell tests — real cross-app rendering is verified manually in the browser. */
export default function RemoteStub() {
    return <div data-testid="remote-stub" />;
}
