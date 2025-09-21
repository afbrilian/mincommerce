Feature: Admin Flash Sale Status Display
  As an admin user
  I want to see real-time flash sale status and statistics
  So that I can monitor the sale performance

  Background:
    Given the application is running
    And I am logged in as an admin user
    And I am on the admin console page
    And there is an existing flash sale in the system

  Scenario: Admin can see flash sale status information
    Given I am on the admin console page
    Then I should see the flash sale status section
    And I should see the current status (upcoming, active, or ended)
    And I should see the product name "Limited Edition Gaming Console"
    And I should see the product price "$599.99"
    And I should see the available quantity
    And I should see the total quantity

  Scenario: Admin can see upcoming flash sale status
    Given I am on the admin console page
    And there is a flash sale with start time in the future
    Then I should see the status as "Upcoming"
    And I should see the time until start
    And I should see the time until end

  Scenario: Admin can see active flash sale status
    Given I am on the admin console page
    And there is a flash sale with start time in the past and end time in the future
    Then I should see the status as "Active"
    And I should see the time until end
    And I should see the time since start

  Scenario: Admin can see ended flash sale status
    Given I am on the admin console page
    And there is a flash sale with end time in the past
    Then I should see the status as "Ended"
    And I should see the time since end

  Scenario: Admin can see flash sale statistics
    Given I am on the admin console page
    And there is an active flash sale with orders
    Then I should see the total orders count
    And I should see the confirmed orders count
    And I should see the pending orders count
    And I should see the available quantity
    And I should see the sold quantity

  Scenario: Admin sees status update when flash sale times are modified
    Given I am on the admin console page
    And there is a flash sale with status "Upcoming"
    When I update the start time to a time in the past
    And I click the "Save" button
    Then I should see the status change to "Active"
    And the status should update automatically

  Scenario: Admin sees status update when flash sale ends
    Given I am on the admin console page
    And there is a flash sale with status "Active"
    When I update the end time to a time in the past
    And I click the "Save" button
    Then I should see the status change to "Ended"
    And the status should update automatically

  Scenario: Admin can see real-time countdown updates
    Given I am on the admin console page
    And there is an upcoming flash sale
    Then I should see a countdown timer
    And the countdown should update every second
    When the start time is reached
    Then the status should automatically change to "Active"
    And the countdown should switch to show time until end

  Scenario: Admin sees error when flash sale data cannot be loaded
    Given I am on the admin console page
    And the API is returning an error for flash sale data
    Then I should see an error message "Unable to load flash sale data"
    And I should see a retry button
    When I click the retry button
    Then the flash sale data should be reloaded

