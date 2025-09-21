Feature: Admin Navigation and Authentication Flow
  As an admin user
  I want to be properly redirected and have access to admin functions
  So that I can manage the flash sale system

  Background:
    Given the application is running
    And I am logged in as an admin user

  Scenario: Admin user should be redirected to admin console when accessing home
    Given I am on the login page
    And I have a valid admin session
    When I navigate to "/"
    Then I should be redirected to "/admin"
    And I should see the admin console page
    And I should see "Admin Console" in the page title

  Scenario: Admin user should be redirected to admin console when accessing protected route
    Given I am on the login page
    And I have a valid admin session
    When I navigate to "/flash-sale"
    Then I should be redirected to "/admin"
    And I should see the admin console page

  Scenario: Regular user should be redirected to flash sale page when accessing admin route
    Given I am on the login page
    And I have a valid user session
    When I navigate to "/admin"
    Then I should be redirected to "/flash-sale"
    And I should see the flash sale page

  Scenario: Unauthenticated user should be redirected to login when accessing protected routes
    Given I am not logged in
    When I navigate to "/admin"
    Then I should be redirected to "/"
    And I should see the login page
    When I navigate to "/flash-sale"
    Then I should be redirected to "/"
    And I should see the login page

  Scenario: Admin user can logout from admin console
    Given I am on the admin console page
    And I am logged in as an admin user
    When I click the "Logout" button
    Then I should be redirected to the login page
    And my session should be cleared
    And I should see the login form

  Scenario: Admin user sees welcome message in header
    Given I am on the admin console page
    And I am logged in as an admin user
    Then I should see "Welcome, Admin" in the header
    And I should see a logout button

