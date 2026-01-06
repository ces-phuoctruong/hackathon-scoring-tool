import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Internship Test Scoring Tool
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          AI-assisted scoring tool using Claude's vision and analysis capabilities
          for faster, fairer, and more consistent candidate evaluation.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-12">
        <Link
          to="/schemas"
          className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            1. Create Schema
          </h2>
          <p className="text-gray-600">
            Define test structure, questions, max points, and evaluation criteria.
          </p>
        </Link>

        <Link
          to="/upload"
          className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            2. Upload Tests
          </h2>
          <p className="text-gray-600">
            Upload images of test papers for AI-powered text extraction and scoring.
          </p>
        </Link>

        <Link
          to="/review"
          className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            3. Review & Export
          </h2>
          <p className="text-gray-600">
            Review AI suggestions, adjust scores, and export results.
          </p>
        </Link>
      </div>
    </div>
  );
}

export default HomePage;
