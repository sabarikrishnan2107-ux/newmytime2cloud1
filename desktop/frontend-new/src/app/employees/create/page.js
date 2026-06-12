import Form from "@/components/Employees/Form";

const EmployeeCreatePage = () => {

    return (
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-100px)]">
            <Form payload={
                {
                    title: "Mr.",
                    first_name: "",
                    last_name: "",
                    full_name: "",
                    display_name: "",
                    employee_id: 0,
                    joining_date: null,
                    branch_id: 1,
                    phone_number: "",
                    whatsapp_number: "",
                    system_user_id: 0,
                    department_id: 1,
                    designation_id: 1,
                    rfid_card_number: "",
                    gender: "",
                    profile_image_base64: null,

                    nationality: "",
                    date_of_birth: null,
                    religion: "",
                    blood_group: "",
                    marital_status: "",
                    email: "",
                    password: ""

                }
            } />
        </div>

    );
};

export default EmployeeCreatePage;