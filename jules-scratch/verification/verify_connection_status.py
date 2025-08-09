from playwright.sync_api import sync_playwright, expect
import re

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Log console messages
    page.on("console", lambda msg: print(f"Browser console: {msg.text}"))
    # Log network requests
    page.on("request", lambda request: print(f">> Request: {request.method} {request.url}"))


    def handle_route(route):
        print(f"Intercepted and aborting request to {route.request.url}")
        route.abort()

    try:
        # Intercept network requests from the beginning
        page.route(re.compile(r".*httpbin\.org.*"), handle_route)

        page.goto("http://localhost:8000", wait_until="networkidle")

        # The periodic check should have already failed.
        expect(page.locator("#connection-status")).to_have_text("Offline: Changes will be saved when reconnected", timeout=15000)
        page.screenshot(path="jules-scratch/verification/01_offline.png")

        # Go back online by un-intercepting
        page.unroute(re.compile(r".*httpbin\.org.*"))

        # The periodic check should now succeed.
        expect(page.locator("#connection-status")).to_have_text("Connected", timeout=15000)
        page.screenshot(path="jules-scratch/verification/02_online_again.png")

        print("Verification successful!")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
