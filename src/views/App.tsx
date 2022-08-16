import { Box, ContextView, FocusView, TextField, Button, DateField, Select } from "@stripe/ui-extension-sdk/ui";
import { ExtensionContextValue, useRefreshDashboardData } from "@stripe/ui-extension-sdk/context";
import {useState} from 'react';
import {createHttpClient, STRIPE_API_KEY} from '@stripe/ui-extension-sdk/http_client';
import Stripe from 'stripe';

const stripe = new Stripe(STRIPE_API_KEY, {
  httpClient: createHttpClient(),
  apiVersion: '2020-08-27',
})
/**
 * This is a view that is rendered in the Stripe dashboard's customer detail page.
 * In stripe-app.json, this view is configured with stripe.dashboard.customer.detail viewport.
 * You can add a new view by running "stripe apps add view" from the CLI.
 */
const App = ({ userContext, environment }: ExtensionContextValue) => {
  const [amount, setAmount] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const date = new Date();
  // handle timezone UTC offset and convert to yyyy/mm/dd
  const dateString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000 ))
                    .toISOString()
                    .split("T")[0];
  const [startDate, setStartDate] = useState<string>(dateString);
  const [iterations, setIterations] = useState<number>(0);
  const [remainder, setRemainder] = useState<number>(0);
  const [picker, setPicker] = useState<boolean>(false);
  const [products, setProducts] = useState<Array<Stripe.Product>>([]);
  const updateProducts = (newProducts: Array<Stripe.Product>) => {
    setProducts(newProducts);
  }
  const [product, setProduct] = useState<string>('');
  const updateProduct = (newProduct: string) => {
    setProduct(newProduct);
  }
  const updateAmount = (newAmount: number) => {
    setAmount(newAmount);
  };
  const updatePaymentAmount = (newAmount: number) => {
    setPaymentAmount(newAmount);
  };
  const updateStartDate = (newDate: string) => {
    setStartDate(newDate);
  };
  const calculatePayments = (amount: number, paymentAmount: number) => {
    const quot = ~~(amount/paymentAmount);
    const remainder = amount % paymentAmount;
    setIterations(quot);
    setRemainder(remainder);
    getProductListforFocusView();
    setPicker(true);
  };
  const refreshDashboardData = useRefreshDashboardData();
  const createSubscriptionScheduleCurrentCustomer = async (amount: number, iterations: number, remainder: number, startDate: string, product: string) => {
    // We can use the current objectContext to get the customer ID.
    const customer_id = environment && environment.objectContext && environment.objectContext.id ? environment.objectContext.id : ''
    // construct phases of the subscription schedule
    const phases: Stripe.SubscriptionScheduleCreateParams.Phase[] = [
      {
        items: [
          {
            price_data: {
              currency: 'usd',
              product: product,
              recurring: {
                interval: 'month',
              },
              unit_amount: amount * 100,
            },
            quantity: 1,
          },
        ],
        iterations: iterations,
        proration_behavior: 'none'
      },
    ];
    // if a remainder is present (not an integer from balance / paydown amount) then we add an extra phase to apply the remainder for the last payment
    if (remainder > 0 ) {
      phases.push(
        {
          items: [
            {
              price_data: {
                currency: 'usd',
                product: product,
                recurring: {
                  interval: 'month',
                },
                unit_amount: remainder * 100,
              },
              quantity: 1,
            },
          ],
          iterations: 1,
          proration_behavior: 'none'
        },
      );
    }

    try {
      // If the user has permission to create a Subscription, this should succeed.
      await stripe.subscriptionSchedules.create(
        {
          customer: customer_id,
          // convert startDate to unix time
          start_date: Math.floor(new Date(startDate).getTime() / 1000),
          end_behavior: 'cancel',
          phases: phases
        }
      );

    } catch (error) {
      console.log(error)
    }
  };

  // Stripe API call
  const createSubscriptionForCustomer = (async (amount: number, iterations: number, remainder: number, startDate: string, product: string) => {
    try {
      await createSubscriptionScheduleCurrentCustomer(amount, iterations, remainder, startDate, product);
      // Call to refresh the data on the dashboard
      setPicker(false);
      refreshDashboardData();
    } catch (error) {
      console.log(error)
    }
  });

  const getProductList = async () => {
    try {
      const products = await stripe.products.list({limit: 3});
      if (products.data.length > 0) {
        updateProducts(products.data); 
      }
    } catch (error) {
      console.log(error)
    }
  }

  const getProductListforFocusView = (async () => {
    try {
      await getProductList();
    } catch (error) {
      console.log(error)
    }
  });
  
  return (
    <ContextView
      title="Recurring Payments"
      brandColor="#F6F8FA" // replace this with your brand color
    >
      <Box css={{ height: "fill", stack: "y", distribute: "space-between" }}>
        <FocusView
          title="Setup Recurring Payments"
          shown={picker}
          onClose={() => setPicker(false)}
          secondaryAction={
            <Button onPress={() => setPicker(false)}>Cancel</Button>
          }
        >
        <Box css={{stack: "x", gap: "medium", padding: 'medium'}}>
            <TextField 
              label="Payments Amount" 
              type="number"
              defaultValue={paymentAmount}
              readOnly
            />
            <TextField 
              label="Number of Payments" 
              type="number"
              defaultValue={iterations}
              disabled
            />
            <TextField 
              label="Remainder" 
              type="number"
              defaultValue={remainder}
              disabled
            />
        </Box>
        <Box css={{padding: 'medium', stack: "x", gap: "medium"}}>
          <DateField
            label="Start Date"
            description="Date the payment schedule starts"
            defaultValue={startDate}
            onChange={(e) => updateStartDate(e.target.value as unknown as string)} 
          />
          <Select
            name="products"
            label="Product"
            required={true}
            onChange={(e) => updateProduct(e.target.value as unknown as string)} 
          >
            <option value="">Choose an option</option>
            {
            products.map((x, y) => 
              <option key={y} value={x.id}>{x.name}</option>
              )
            }
          </Select>
        </Box>
        <Box css={{padding: 'medium'}}>
          <Button disabled={product.length < 1} type="primary" onPress={() => createSubscriptionForCustomer(
            paymentAmount, 
            iterations, 
            remainder, 
            startDate, 
            product)
          }>Create Payment Schedule</Button>
        </Box>
        </FocusView>
        <Box css={{stack: 'y', gap: 'medium'}}>
          <TextField 
            label="Amount Due" 
            type="number"
            onChange={(e) => updateAmount(e.target.value as unknown as number)} 
          />
          <TextField 
            label="Payment Amount" 
            type="number"
            onChange={(e) => updatePaymentAmount(e.target.value as unknown as number)} 
          />
          <Button type="primary" css={{width: 'fill', alignX: 'center'}} onPress={() => calculatePayments(amount as number, paymentAmount as number)}>Setup Payment Schedule</Button>
        </Box>
      </Box>
    </ContextView>
  );
};

export default App;
