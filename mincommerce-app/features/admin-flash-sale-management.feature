Feature: Admin Flash Sale Management
  As an admin user
  I want to manage flash sale settings
  So that I can control when sales start and end

  Background:
    Given the application is running
    And I am logged in as an admin user
    And I am on the admin console page
    And there is an existing flash sale in the system

  Scenario: Admin can see flash sale management section
    Given I am on the admin console page
    Then I should see "Flash Sale Management" as the main heading
    And I should see a form with start time input
    And I should see a form with end time input
    And I should see a "Save" button
    And I should see the current flash sale status

  Scenario: Admin can see existing flash sale data in the form
    Given I am on the admin console page
    And there is an existing flash sale with start time "2024-01-01T10:00:00Z" and end time "2024-01-01T12:00:00Z"
    Then the start time input should contain "2024-01-01T10:00:00Z"
    And the end time input should contain "2024-01-01T12:00:00Z"

  Scenario: Admin can update flash sale start and end times
    Given I am on the admin console page
    And I can see the flash sale management form
    When I update the start time to "2024-01-01T09:00:00Z"
    And I update the end time to "2024-01-01T11:00:00Z"
    And I click the "Save" button
    Then I should see a success message
    And the flash sale should be updated in the system
    And the form should show the updated values

  Scenario: Admin sees validation error for invalid date range
    Given I am on the admin console page
    And I can see the flash sale management form
    When I update the start time to "2024-01-01T12:00:00Z"
    And I update the end time to "2024-01-01T10:00:00Z"
    And I click the "Save" button
    Then I should see an error message "End time must be after start time"
    And the flash sale should not be updated

  Scenario: Admin sees validation error for empty start time
    Given I am on the admin console page
    And I can see the flash sale management form
    When I clear the start time input
    And I click the "Save" button
    Then I should see an error message "Start time is required"
    And the flash sale should not be updated

  Scenario: Admin sees validation error for empty end time
    Given I am on the admin console page
    And I can see the flash sale management form
    When I clear the end time input
    And I click the "Save" button
    Then I should see an error message "End time is required"
    And the flash sale should not be updated

  Scenario: Admin sees API error when flash sale update fails
    Given I am on the admin console page
    And I can see the flash sale management form
    And the API is returning an error
    When I update the start time to "2024-01-01T09:00:00Z"
    And I update the end time to "2024-01-01T11:00:00Z"
    And I click the "Save" button
    Then I should see an error message "Something went wrong. Please try again."
    And the form should retain the original values

  Scenario: Admin can create new flash sale when none exists
    Given I am on the admin console page
    And there is no existing flash sale in the system
    When I enter start time "2024-01-01T10:00:00Z"
    And I enter end time "2024-01-01T12:00:00Z"
    And I click the "Save" button
    Then I should see a success message
    And the flash sale should be created in the system
    And I should see the flash sale status updated

