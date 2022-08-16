# Stripe-Apps-Subscription-Schedules
Installment payments with Subscription Schedules in the Customer detail view via Stripe Apps

# Use Case
Customer Service Represenative (CSR) sets up a payment plan in installments to paydown an outstanding balance for a Customer. The CSR would search for the Customer in the dashboard and view the Customer detail view. 
The Stripe UI exstenion for the Customer detail view uses an "Amount Due" as the total amount to which installments are to paydown based on a "Payment Amount" that a Customer would tell the CSR they could afford per month. 
The Focus view after selecting "Setup Payment Schedule" will calculate the number of installments or iterations, and if applicable, the remiander where the final installment is less than the previous iterations - which is achieved using phases in Subscription Schedules. 

# Install
`stripe apps start`
