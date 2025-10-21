from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:3000")
        page.get_by_label("User Name").fill("Test User")
        page.get_by_label("Agent Name").fill("Test Agent")
        page.get_by_label("Agent Description").fill("Test Description")
        page.get_by_label("Agent Motivation").fill("Test Motivation")
        page.get_by_label("Agent Knowledge").fill("Test Knowledge")
        page.get_by_role("button", name="Start").click()
        page.wait_for_selector("textarea")
        page.fill("textarea", "Hello, world!")
        page.press("textarea", "Enter")
        page.wait_for_selector("div:has-text('Hello, world!')")
        page.wait_for_timeout(5000)  # Wait for the response
        page.screenshot(path="jules-scratch/verification/chat_verification.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
