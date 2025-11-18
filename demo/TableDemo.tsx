import Table from "../components/Table";
import Heading1 from "../components/Heading1";
import Button from "../components/Button";

export default function TableDemo() {
  const columns = [
    { key: "date", label: "Date" },
    { key: "description", label: "Description" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
  ];

  const data = [
    {
      date: "June 15, 2024",
      description: "Premium Plan Renewal",
      amount: "$19.99",
      status: <Button variant="neutral" size="sm" className="ps-12 pe-12">Paid</Button>,
    },
    {
      date: "May 15, 2024",
      description: "Premium Plan Renewal",
      amount: "$19.99",
      status: <Button variant="neutral" size="sm" className="ps-12 pe-12">Paid</Button>,
    },
    {
      date: "April 15, 2024",
      description: "Premium Plan Renewal",
      amount: "$19.99",
      status: <Button variant="neutral" size="sm" className="ps-12 pe-12">Paid</Button>,
    },
  ];

  return (
    <div className="p-8 space-y-12 text-left">
      <Heading1 gutter="md">Table Demo</Heading1>
      <Table columns={columns} data={data} />
    </div>
  );
}
