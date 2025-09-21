Feature: User Login and Authentication
  As a user
  I want to login with my email
  So that I can access the flash sale system

  Background:
    Given the application is running
    And I am on the login page

  Scenario: Admin user login
    Given I am an admin user with email "admin@brilian.af"
    When I enter my email "admin@brilian.af" in the email field
    And I click the login button
    Then I should be redirected to the admin console
    And I should see the admin dashboard

  Scenario: Regular user login
    Given I am a regular user with email "user@example.com"
    When I enter my email "user@example.com" in the email field
    And I click the login button
    Then I should be redirected to the flash sale page
    And I should see the flash sale interface

  Scenario: New user auto-registration
    Given I am a new user with email "newuser@example.com"
    When I enter my email "newuser@example.com" in the email field
    And I click the login button
    Then I should be automatically registered as a regular user
    And I should be redirected to the flash sale page
    And I should see the flash sale interface

  Scenario: Invalid email format
    Given I am on the login page
    When I enter an invalid email "invalid-email"
    And I click the login button
    Then I should see an error message about invalid email format
    And I should remain on the login page

  Scenario: Empty email field
    Given I am on the login page
    When I leave the email field empty
    And I click the login button
    Then I should see an error message about required email
    And I should remain on the login page
