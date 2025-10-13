import React from "react";

const RequestPage = () => {
  return (
    <div className="p-6 md:ml-64">
      <h1 className="text-3xl font-bold mb-4">Request Page</h1>
      <p className="text-gray-700">
        Halaman ini untuk menampilkan semua request yang masuk.
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white shadow-md p-4 rounded-lg">
          <h2 className="font-semibold text-lg">Request #1</h2>
          <p className="text-gray-500">Detail request 1</p>
        </div>
        <div className="bg-white shadow-md p-4 rounded-lg">
          <h2 className="font-semibold text-lg">Request #2</h2>
          <p className="text-gray-500">Detail request 2</p>
        </div>
        <div className="bg-white shadow-md p-4 rounded-lg">
          <h2 className="font-semibold text-lg">Request #3</h2>
          <p className="text-gray-500">Detail request 3</p>
        </div>
      </div>
    </div>
  );
};

export default RequestPage;
