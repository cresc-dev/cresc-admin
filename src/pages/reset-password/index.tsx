import { Card, Steps } from 'antd';
import { useParams } from 'react-router-dom';
import SendEmail from './components/send-email';
import SetPassword from './components/set-password';
import Success from './components/success';

const body = {
  '0': <SendEmail />,
  '1': <SetPassword />,
  '3': <Success />,
};

export const ResetPassword = () => {
  const { step = '0' } = useParams() as { step?: keyof typeof body };
  const steps = [
    { title: 'Enter your email' },
    { title: 'Set a new password' },
    { title: 'Success' },
  ];
  const currentStep = step === '3' ? 2 : Number(step);
  return (
    <Card className="w-max mx-auto">
      <Steps className="mb-12" current={currentStep} items={steps} />
      {body[step]}
    </Card>
  );
};

export const Component = ResetPassword;
