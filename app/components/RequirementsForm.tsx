import { useState } from 'react';
import { FilteringRequirements, Certification, License, EducationRequirement, ExperienceRequirement } from '../types/filtering';

interface RequirementsFormProps {
  requirement?: FilteringRequirements;
  onSave: (requirement: FilteringRequirements) => void;
  onCancel: () => void;
}

export default function RequirementsForm({ requirement, onSave, onCancel }: RequirementsFormProps) {
  const [name, setName] = useState(requirement?.name || '');
  const [description, setDescription] = useState(requirement?.description || '');
  const [color, setColor] = useState(requirement?.color || '#3B82F6');
  const [certifications, setCertifications] = useState<Certification[]>(requirement?.certifications || []);
  const [licenses, setLicenses] = useState<License[]>(requirement?.licenses || []);
  const [educationRequirements, setEducationRequirements] = useState<EducationRequirement[]>(
    requirement?.educationRequirements || []
  );
  const [experienceRequirements, setExperienceRequirements] = useState<ExperienceRequirement[]>(
    requirement?.experienceRequirements || []
  );
  const [minimumYearsOverallExperience, setMinimumYearsOverallExperience] = useState(
    requirement?.minimumYearsOverallExperience || 0
  );
  const [matchThreshold, setMatchThreshold] = useState(requirement?.matchThreshold || 70);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: requirement?.id || crypto.randomUUID(),
      name,
      description,
      color,
      certifications,
      licenses,
      educationRequirements,
      experienceRequirements,
      minimumYearsOverallExperience,
      matchThreshold,
      updatedAt: new Date(),
    });
  };

  const addCertification = () => {
    setCertifications([...certifications, { id: crypto.randomUUID(), name: '', isRequired: false }]);
  };

  const updateCertification = (id: string, field: keyof Certification, value: any) => {
    setCertifications(
      certifications.map((cert) => (cert.id === id ? { ...cert, [field]: value } : cert))
    );
  };

  const removeCertification = (id: string) => {
    setCertifications(certifications.filter((cert) => cert.id !== id));
  };

  const addLicense = () => {
    setLicenses([...licenses, { id: crypto.randomUUID(), name: '', isRequired: false }]);
  };

  const updateLicense = (id: string, field: keyof License, value: any) => {
    setLicenses(licenses.map((license) => (license.id === id ? { ...license, [field]: value } : license)));
  };

  const removeLicense = (id: string) => {
    setLicenses(licenses.filter((license) => license.id !== id));
  };

  const addEducationRequirement = () => {
    setEducationRequirements([
      ...educationRequirements,
      { degree: '', field: '', required: false },
    ]);
  };

  const updateEducationRequirement = (index: number, field: keyof EducationRequirement, value: any) => {
    const newRequirements = [...educationRequirements];
    newRequirements[index] = { ...newRequirements[index], [field]: value };
    setEducationRequirements(newRequirements);
  };

  const removeEducationRequirement = (index: number) => {
    setEducationRequirements(educationRequirements.filter((_, i) => i !== index));
  };

  const addExperienceRequirement = () => {
    setExperienceRequirements([
      ...experienceRequirements,
      { skill: '', yearsRequired: 0, required: false },
    ]);
  };

  const updateExperienceRequirement = (index: number, field: keyof ExperienceRequirement, value: any) => {
    const newRequirements = [...experienceRequirements];
    newRequirements[index] = { ...newRequirements[index], [field]: value };
    setExperienceRequirements(newRequirements);
  };

  const removeExperienceRequirement = (index: number) => {
    setExperienceRequirements(experienceRequirements.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="color" className="block text-sm font-medium text-gray-700">
          Color
        </label>
        <input
          type="color"
          id="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="mt-1 block h-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Certifications</h3>
          <button
            type="button"
            onClick={addCertification}
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add Certification
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {certifications.map((cert) => (
            <div key={cert.id} className="flex items-center space-x-4">
              <input
                type="text"
                value={cert.name}
                onChange={(e) => updateCertification(cert.id, 'name', e.target.value)}
                placeholder="Certification name"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={cert.isRequired}
                  onChange={(e) => updateCertification(cert.id, 'isRequired', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Required</span>
              </label>
              <button
                type="button"
                onClick={() => removeCertification(cert.id)}
                className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Licenses</h3>
          <button
            type="button"
            onClick={addLicense}
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add License
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {licenses.map((license) => (
            <div key={license.id} className="flex items-center space-x-4">
              <input
                type="text"
                value={license.name}
                onChange={(e) => updateLicense(license.id, 'name', e.target.value)}
                placeholder="License name"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={license.isRequired}
                  onChange={(e) => updateLicense(license.id, 'isRequired', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Required</span>
              </label>
              <button
                type="button"
                onClick={() => removeLicense(license.id)}
                className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Education Requirements</h3>
          <button
            type="button"
            onClick={addEducationRequirement}
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add Education
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {educationRequirements.map((edu, index) => (
            <div key={index} className="flex items-center space-x-4">
              <input
                type="text"
                value={edu.degree}
                onChange={(e) => updateEducationRequirement(index, 'degree', e.target.value)}
                placeholder="Degree"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <input
                type="text"
                value={edu.field}
                onChange={(e) => updateEducationRequirement(index, 'field', e.target.value)}
                placeholder="Field of study"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={edu.required}
                  onChange={(e) => updateEducationRequirement(index, 'required', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Required</span>
              </label>
              <button
                type="button"
                onClick={() => removeEducationRequirement(index)}
                className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Experience Requirements</h3>
          <button
            type="button"
            onClick={addExperienceRequirement}
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add Experience
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {experienceRequirements.map((exp, index) => (
            <div key={index} className="flex items-center space-x-4">
              <input
                type="text"
                value={exp.skill}
                onChange={(e) => updateExperienceRequirement(index, 'skill', e.target.value)}
                placeholder="Skill"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <input
                type="number"
                value={exp.yearsRequired}
                onChange={(e) => updateExperienceRequirement(index, 'yearsRequired', parseInt(e.target.value))}
                placeholder="Years required"
                className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exp.required}
                  onChange={(e) => updateExperienceRequirement(index, 'required', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Required</span>
              </label>
              <button
                type="button"
                onClick={() => removeExperienceRequirement(index)}
                className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="minimumYearsOverallExperience" className="block text-sm font-medium text-gray-700">
          Minimum Years of Overall Experience
        </label>
        <input
          type="number"
          id="minimumYearsOverallExperience"
          value={minimumYearsOverallExperience}
          onChange={(e) => setMinimumYearsOverallExperience(parseInt(e.target.value))}
          min="0"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="matchThreshold" className="block text-sm font-medium text-gray-700">
          Match Threshold (%)
        </label>
        <input
          type="range"
          id="matchThreshold"
          value={matchThreshold}
          onChange={(e) => setMatchThreshold(parseInt(e.target.value))}
          min="0"
          max="100"
          className="mt-1 block w-full"
        />
        <div className="mt-1 text-sm text-gray-500">{matchThreshold}%</div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Save
        </button>
      </div>
    </form>
  );
} 